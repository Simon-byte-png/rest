import { createHash } from "node:crypto";
import {
  CONTRACT_VERSION,
  handoffJobSchema,
  handoffJobStateSchema,
  handoffStartRequestSchema,
  handoffSummarySchema,
  type HandoffJob,
  type HandoffJobState,
  type HandoffStartRequest,
  type HandoffSummary
} from "../../domain/contracts.js";
import {
  AppError,
  toErrorResponse,
  unknownToAppError
} from "../../domain/errors.js";
import type {
  AgentLLM,
  Clock,
  ClassifiedMail,
  HandoffCompletionSink,
  HandoffJobRecord,
  HandoffJobRepository,
  IdGenerator,
  IdempotencyStore,
  MailItem,
  MailProvider
} from "../../domain/ports.js";

const JOB_TTL_SECONDS = 24 * 60 * 60;

export class HandoffService {
  constructor(
    private readonly jobs: HandoffJobRepository,
    private readonly idempotency: IdempotencyStore<string>,
    private readonly mail: MailProvider,
    private readonly agent: AgentLLM,
    private readonly completionSink: HandoffCompletionSink,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async start(
    input: HandoffStartRequest,
    idempotencyKey: string
  ): Promise<HandoffJob> {
    const request = handoffStartRequestSchema.parse(input);
    const existingJobId = await this.idempotency.get(idempotencyKey);
    if (existingJobId) {
      const existing = await this.jobs.get(existingJobId);
      if (existing) {
        return handoffJobSchema.parse({
          ...existing.job,
          request_id: request.request_id
        });
      }
    }

    const jobId = this.ids.next("hj");
    const now = this.clock.now().toISOString();
    const job = handoffJobSchema.parse({
      schema_version: CONTRACT_VERSION,
      request_id: request.request_id,
      job_id: jobId,
      status: "queued",
      estimated_wait_seconds: request.include_gmail ? 20 : 5,
      micro_reset_available: true
    });
    const state = handoffJobStateSchema.parse({
      schema_version: CONTRACT_VERSION,
      request_id: request.request_id,
      job_id: jobId,
      status: "queued",
      progress_stage: "queued",
      estimated_wait_seconds: job.estimated_wait_seconds,
      summary: null,
      error: null
    });
    await this.jobs.create({
      job,
      request,
      state,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
      cancelled: false
    });
    await this.idempotency.put(
      idempotencyKey,
      jobId,
      JOB_TTL_SECONDS
    );

    setImmediate(() => {
      void this.process(jobId);
    });
    return job;
  }

  async get(jobId: string, requestId: string): Promise<HandoffJobState> {
    const record = await this.requireJob(jobId);
    return handoffJobStateSchema.parse({
      ...record.state,
      request_id: requestId,
      summary: record.state.summary
        ? { ...record.state.summary, request_id: requestId }
        : record.state.summary,
      error: record.state.error
        ? { ...record.state.error, request_id: requestId }
        : record.state.error
    });
  }

  async cancel(jobId: string): Promise<void> {
    const record = await this.requireJob(jobId);
    if (["succeeded", "failed", "cancelled"].includes(record.state.status)) {
      return;
    }
    const now = this.clock.now().toISOString();
    await this.jobs.update(jobId, {
      cancelled: true,
      updatedAt: now,
      state: handoffJobStateSchema.parse({
        ...record.state,
        status: "cancelled",
        progress_stage: "cancelled",
        estimated_wait_seconds: 0,
        summary: null,
        error: null
      })
    });
  }

  async process(jobId: string): Promise<void> {
    try {
      const record = await this.requireJob(jobId);
      if (record.cancelled) {
        return;
      }

      await this.setRunning(record, "fetching_mail", 18);
      const mailResult = await this.fetchMail(record.request);
      if (await this.isCancelled(jobId)) {
        return;
      }

      await this.setRunning(record, "classifying", 12);
      const draft = await this.agent.summarizeHandoff({
        request: record.request,
        mail: mailResult.items,
        mailAvailable: mailResult.available
      });
      const classifications = this.normalizeClassifications(
        mailResult.items,
        draft.classifications
      );
      if (await this.isCancelled(jobId)) {
        return;
      }

      await this.setRunning(record, "creating_drafts", 7);
      const summary = await this.buildSummary(
        record,
        mailResult.items,
        mailResult.available,
        classifications,
        draft.tomorrowFirstStep
      );
      if (await this.isCancelled(jobId)) {
        return;
      }

      await this.setRunning(record, "preparing_receipt", 2);
      const now = this.clock.now().toISOString();
      const completed = handoffJobStateSchema.parse({
        schema_version: CONTRACT_VERSION,
        request_id: record.request.request_id,
        job_id: jobId,
        status: "succeeded",
        progress_stage: "completed",
        estimated_wait_seconds: null,
        summary,
        error: null
      });
      await this.jobs.update(jobId, {
        state: completed,
        updatedAt: now
      });
      const finalRecord = await this.requireJob(jobId);
      if (record.request.response_channel === "imessage") {
        await this.completionSink.notify(finalRecord);
      }
    } catch (error) {
      const appError = unknownToAppError(error);
      const record = await this.jobs.get(jobId);
      if (!record || record.cancelled) {
        return;
      }
      await this.jobs.update(jobId, {
        updatedAt: this.clock.now().toISOString(),
        state: handoffJobStateSchema.parse({
          schema_version: CONTRACT_VERSION,
          request_id: record.request.request_id,
          job_id: jobId,
          status: "failed",
          progress_stage: "failed",
          estimated_wait_seconds: null,
          summary: null,
          error: toErrorResponse(appError, record.request.request_id)
        })
      });
    }
  }

  private async fetchMail(
    request: HandoffStartRequest
  ): Promise<{ items: MailItem[]; available: boolean }> {
    if (!request.include_gmail) {
      return { items: [], available: false };
    }
    try {
      return {
        items: await this.mail.fetchUnread({
          accountId: request.gmail_account_id ?? null,
          since: this.clock.now().toISOString(),
          maxItems: 30
        }),
        available: true
      };
    } catch {
      return { items: [], available: false };
    }
  }

  private normalizeClassifications(
    mail: MailItem[],
    proposed: ClassifiedMail[]
  ): ClassifiedMail[] {
    const validIds = new Set(mail.map((item) => item.id));
    const byId = new Map<string, ClassifiedMail>();
    for (const item of proposed) {
      if (validIds.has(item.id) && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
    return mail.map(
      (item) =>
        byId.get(item.id) ?? {
          id: item.id,
          priority: "uncertain",
          gist: item.subject || "未命名邮件",
          reason: "模型没有为这封邮件返回可验证的分类。",
          suggestedDraft: null
        }
    );
  }

  private async buildSummary(
    record: HandoffJobRecord,
    mail: MailItem[],
    mailAvailable: boolean,
    classifications: ClassifiedMail[],
    proposedFirstStep: string | null
  ): Promise<HandoffSummary> {
    const mailById = new Map(mail.map((item) => [item.id, item]));
    const draftResults = new Map<
      string,
      { saved: boolean; draftId: string | null; preview: string }
    >();

    for (const item of classifications) {
      const source = mailById.get(item.id);
      if (
        !source ||
        !item.suggestedDraft ||
        !["tonight_required", "tomorrow"].includes(item.priority)
      ) {
        continue;
      }
      try {
        const result = await this.mail.createDraft({
          forItemId: source.id,
          threadId: source.threadId,
          to: source.replyTo ?? source.from,
          subject: source.subject.startsWith("Re:")
            ? source.subject
            : `Re: ${source.subject}`,
          bodyText: item.suggestedDraft,
          dedupeKey: this.draftDedupeKey(record.job.job_id, source.id)
        });
        draftResults.set(source.id, {
          saved: true,
          draftId: result.draftId,
          preview: item.suggestedDraft.slice(0, 160)
        });
      } catch {
        draftResults.set(source.id, {
          saved: false,
          draftId: null,
          preview: item.suggestedDraft.slice(0, 160)
        });
      }
    }

    const toSummaryItem = (item: ClassifiedMail) => {
      const source = mailById.get(item.id);
      const draftResult = draftResults.get(item.id);
      return {
        id: item.id,
        from: source?.from ?? "",
        subject: source?.subject ?? "",
        gist: item.gist,
        priority_reason: item.reason,
        draft_saved: draftResult?.saved ?? false
      };
    };
    const includedSources: string[] = [];
    const excludedSources: string[] = [
      "wechat",
      "phone_calls",
      "other_unconnected_channels"
    ];
    if (record.request.open_loops.length > 0) {
      includedSources.push("user_submitted_open_loops");
    }
    if (mailAvailable) {
      includedSources.push("authorized_gmail");
    } else if (record.request.include_gmail) {
      excludedSources.unshift("authorized_gmail_unavailable");
    } else {
      excludedSources.unshift("authorized_gmail_not_requested");
    }

    const firstStep =
      proposedFirstStep ??
      record.request.open_loops[0]?.text ??
      classifications.find((item) => item.priority === "tomorrow")?.gist ??
      null;
    const heldOpenLoops = record.request.open_loops.map((item) => ({
      id: item.id,
      title: item.text,
      status: "saved_for_tomorrow" as const
    }));
    const heldDrafts = classifications
      .filter((item) => draftResults.get(item.id)?.saved)
      .map((item) => ({
        id: item.id,
        title: item.gist,
        status: "gmail_draft_saved" as const
      }));
    const heldUncertain = classifications
      .filter((item) => item.priority === "uncertain")
      .map((item) => ({
        id: item.id,
        title: item.gist,
        status: "needs_review" as const
      }));

    return handoffSummarySchema.parse({
      schema_version: CONTRACT_VERSION,
      request_id: record.request.request_id,
      job_id: record.job.job_id,
      total_unread: mail.length,
      tonight_required: classifications
        .filter((item) => item.priority === "tonight_required")
        .map(toSummaryItem),
      tomorrow: classifications
        .filter((item) => item.priority === "tomorrow")
        .map(toSummaryItem),
      no_action_count: classifications.filter(
        (item) => item.priority === "no_action"
      ).length,
      uncertain: classifications
        .filter((item) => item.priority === "uncertain")
        .map(toSummaryItem),
      drafts: classifications
        .filter((item) => draftResults.has(item.id))
        .map((item) => {
          const result = draftResults.get(item.id)!;
          return {
            for_item_id: item.id,
            preview: result.preview,
            saved: result.saved,
            gmail_draft_id: result.draftId
          };
        }),
      pause_receipt: {
        coverage: {
          included_sources: includedSources,
          excluded_sources: excludedSources,
          since: record.createdAt
        },
        held_items: [
          ...heldOpenLoops,
          ...heldDrafts,
          ...heldUncertain
        ],
        tomorrow_first_step: firstStep,
        conclusion: mailAvailable
          ? "你主动交接的事项已经保存；在已授权 Gmail 范围内，邮件已经完成分类。"
          : record.request.include_gmail
            ? "你主动交接的事项已经保存；Gmail 本次不可用，因此没有检查邮箱。"
            : "你主动交接的事项已经保存；本次未请求检查 Gmail。",
        coverage_note:
          "结论只适用于上述已覆盖来源，未连接渠道不在本次判断范围内。"
      }
    });
  }

  private async setRunning(
    record: HandoffJobRecord,
    stage: HandoffJobState["progress_stage"],
    remaining: number
  ): Promise<void> {
    await this.jobs.update(record.job.job_id, {
      updatedAt: this.clock.now().toISOString(),
      state: handoffJobStateSchema.parse({
        ...record.state,
        status: "running",
        progress_stage: stage,
        estimated_wait_seconds: remaining,
        summary: null,
        error: null
      })
    });
  }

  private async requireJob(jobId: string): Promise<HandoffJobRecord> {
    const record = await this.jobs.get(jobId);
    if (!record) {
      throw new AppError({
        code: "JOB_NOT_FOUND",
        message: "没有找到这次交班任务。",
        statusCode: 404,
        retryable: false
      });
    }
    return record;
  }

  private async isCancelled(jobId: string): Promise<boolean> {
    return (await this.jobs.get(jobId))?.cancelled ?? true;
  }

  private draftDedupeKey(jobId: string, mailId: string): string {
    return createHash("sha256")
      .update(`${jobId}:${mailId}`)
      .digest("hex");
  }
}
