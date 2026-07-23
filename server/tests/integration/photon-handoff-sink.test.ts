import { describe, expect, it } from "vitest";
import type {
  HandoffJobRecord,
  OutboundMessage
} from "../../src/domain/ports.js";
import { RecordingMessagingChannel } from "../../src/infra/provider-stubs.js";
import { MessagingHandoffCompletionSink } from "../../src/messaging/index.js";

describe("MessagingHandoffCompletionSink", () => {
  it("forwards a safe receipt to iMessage without claiming drafts were sent", async () => {
    const channel = new RecordingMessagingChannel();
    const sink = new MessagingHandoffCompletionSink(
      channel,
      () => "recipient-reference"
    );

    await sink.notify(successfulRecord());

    expect(channel.sent()).toEqual<OutboundMessage[]>([
      {
        recipientId: "recipient-reference",
        correlationId: "handoff:job-1:completed",
        text: [
          "今晚的事项已经替你收好。",
          "今晚需要处理：1 项",
          "明天处理：1 项",
          "已保存邮件草稿：1 封（未发送）",
          "明天第一步：回复老师",
          "你可以先休息，邮件不会自动发送。"
        ].join("\n")
      }
    ]);
  });

  it("does nothing without an account-to-recipient link", async () => {
    const channel = new RecordingMessagingChannel();
    const sink = new MessagingHandoffCompletionSink(channel, () => null);
    await sink.notify(successfulRecord());
    expect(channel.sent()).toEqual([]);
  });
});

function successfulRecord(): HandoffJobRecord {
  return {
    job: {
      schema_version: "1.0",
      request_id: "request-1",
      job_id: "job-1",
      status: "running",
      estimated_wait_seconds: 1,
      micro_reset_available: true
    },
    request: {
      schema_version: "1.0",
      request_id: "request-1",
      source: "photon_message",
      include_gmail: true,
      gmail_account_id: "account-reference",
      open_loops: [],
      response_channel: "imessage",
      timezone: "Asia/Shanghai",
      locale: "zh-CN"
    },
    state: {
      schema_version: "1.0",
      request_id: "request-1",
      job_id: "job-1",
      status: "succeeded",
      progress_stage: "completed",
      estimated_wait_seconds: null,
      error: null,
      summary: {
        schema_version: "1.0",
        request_id: "request-1",
        job_id: "job-1",
        total_unread: 2,
        tonight_required: [mailItem("mail-1", true)],
        tomorrow: [mailItem("mail-2", false)],
        no_action_count: 0,
        uncertain: [],
        drafts: [
          {
            for_item_id: "mail-1",
            preview: "好的",
            saved: true,
            gmail_draft_id: "draft-1"
          }
        ],
        pause_receipt: {
          coverage: {
            included_sources: ["authorized_gmail"],
            excluded_sources: [],
            since: "2026-07-23T20:00:00+08:00"
          },
          held_items: [],
          tomorrow_first_step: "回复老师",
          conclusion: "已收好"
        }
      }
    },
    idempotencyKey: "idempotency-1",
    createdAt: "2026-07-23T20:00:00+08:00",
    updatedAt: "2026-07-23T20:01:00+08:00",
    cancelled: false
  };
}

function mailItem(id: string, draftSaved: boolean) {
  return {
    id,
    from: "redacted",
    subject: "redacted",
    gist: "待处理事项",
    priority_reason: "用户需确认",
    draft_saved: draftSaved
  };
}
