import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "../domain/errors.js";
import type {
  DraftRequest,
  DraftResult,
  HandoffCompletionSink,
  HandoffJobRecord,
  InboundMessage,
  InboundMessageMapper,
  MailFetchContext,
  MailItem,
  MailProvider,
  MessagingChannel,
  OutboundMessage,
  ProviderCallOptions,
  ProviderHealth
} from "../domain/ports.js";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));

export class UnavailableMailProvider implements MailProvider {
  async health(): Promise<ProviderHealth> {
    return "unavailable";
  }

  async fetchUnread(_context: MailFetchContext): Promise<MailItem[]> {
    throw new AppError({
      code: "GMAIL_NOT_CONNECTED",
      message: "Gmail 尚未连接。",
      statusCode: 503,
      retryable: true,
      fallback: "OPEN_LOOPS_ONLY"
    });
  }

  async createDraft(_request: DraftRequest): Promise<DraftResult> {
    throw new AppError({
      code: "GMAIL_NOT_CONNECTED",
      message: "Gmail 尚未连接。",
      statusCode: 503,
      retryable: true,
      fallback: "SUMMARY_ONLY"
    });
  }
}

export class FixtureMailProvider implements MailProvider {
  private readonly items: MailItem[];
  private readonly drafts = new Map<string, DraftResult>();

  constructor(path?: string) {
    const fixturePath =
      path ??
      resolve(
        sourceDirectory,
        "../../../contracts/fixtures/mail-items-demo.json"
      );
    this.items = JSON.parse(readFileSync(fixturePath, "utf8")) as MailItem[];
  }

  async health(): Promise<ProviderHealth> {
    return "ready";
  }

  async fetchUnread(_context: MailFetchContext): Promise<MailItem[]> {
    return structuredClone(this.items);
  }

  async createDraft(request: DraftRequest): Promise<DraftResult> {
    const existing = this.drafts.get(request.dedupeKey);
    if (existing) {
      return structuredClone(existing);
    }
    const result = { draftId: `fixture-draft-${this.drafts.size + 1}` };
    this.drafts.set(request.dedupeKey, result);
    return structuredClone(result);
  }
}

export class NoopHandoffCompletionSink
  implements HandoffCompletionSink
{
  async notify(_record: HandoffJobRecord): Promise<void> {
    // W2 supplies the Photon-backed implementation.
  }
}

export class MessagingHandoffCompletionSink
  implements HandoffCompletionSink
{
  constructor(
    private readonly channel: MessagingChannel,
    private readonly recipientId: string
  ) {}

  async notify(record: HandoffJobRecord): Promise<void> {
    const receipt = record.state.summary?.pause_receipt;
    if (!receipt) {
      return;
    }
    const nextStep = receipt.tomorrow_first_step
      ? `\n明天第一步：${receipt.tomorrow_first_step}`
      : "";
    await this.channel.send({
      recipientId: this.recipientId,
      text: `${receipt.conclusion}${nextStep}`,
      correlationId: record.job.job_id
    });
  }
}

export class RecordingMessagingChannel implements MessagingChannel {
  private readonly messages: OutboundMessage[] = [];

  async health(): Promise<ProviderHealth> {
    return "ready";
  }

  async send(
    message: OutboundMessage,
    options?: ProviderCallOptions
  ): Promise<void> {
    if (options?.signal?.aborted) {
      throw new AppError({
        code: "PHOTON_UNAVAILABLE",
        message: "消息发送已取消。",
        statusCode: 503,
        retryable: true,
        fallback: "APP_ONLY"
      });
    }
    this.messages.push(structuredClone(message));
  }

  sent(): OutboundMessage[] {
    return structuredClone(this.messages);
  }
}

export class ConsoleMessagingChannel implements MessagingChannel {
  constructor(
    private readonly writer: (line: string) => void = console.info
  ) {}

  async health(): Promise<ProviderHealth> {
    return "ready";
  }

  async send(
    message: OutboundMessage,
    options?: ProviderCallOptions
  ): Promise<void> {
    if (options?.signal?.aborted) {
      throw new AppError({
        code: "PHOTON_UNAVAILABLE",
        message: "消息发送已取消。",
        statusCode: 503,
        retryable: true,
        fallback: "APP_ONLY"
      });
    }
    this.writer(
      JSON.stringify({
        provider: "console",
        recipient_id: message.recipientId,
        correlation_id: message.correlationId,
        text_length: message.text.length
      })
    );
  }
}

export class UnavailableMessagingChannel implements MessagingChannel {
  async health(): Promise<ProviderHealth> {
    return "unavailable";
  }

  async send(
    _message: OutboundMessage,
    _options?: ProviderCallOptions
  ): Promise<void> {
    throw new AppError({
      code: "PHOTON_UNAVAILABLE",
      message: "消息渠道暂时不可用。",
      statusCode: 503,
      retryable: true,
      fallback: "APP_ONLY"
    });
  }
}

export class NormalizedInboundMessageMapper
  implements InboundMessageMapper<InboundMessage>
{
  map(payload: InboundMessage): InboundMessage {
    const required = [
      payload.eventId,
      payload.providerMessageId,
      payload.senderId,
      payload.recipientId,
      payload.receivedAt
    ];
    if (
      required.some((value) => value.length === 0) ||
      Number.isNaN(Date.parse(payload.receivedAt))
    ) {
      throw new AppError({
        code: "INVALID_REQUEST",
        message: "入站消息无法映射为标准事件。",
        statusCode: 400,
        retryable: false
      });
    }
    return structuredClone(payload);
  }
}
