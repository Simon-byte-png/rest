import type {
  HandoffCompletionSink,
  HandoffJobRecord,
  MessagingChannel
} from "../domain/ports.js";

export type HandoffRecipientResolver = (
  record: HandoffJobRecord
) => Promise<string | null> | string | null;

/**
 * Bridges a completed Gmail/open-loop handoff to iMessage without coupling
 * either provider. It never sends email: Gmail drafts remain review-only.
 */
export class MessagingHandoffCompletionSink
  implements HandoffCompletionSink
{
  constructor(
    private readonly channel: MessagingChannel,
    private readonly resolveRecipient: HandoffRecipientResolver
  ) {}

  async notify(record: HandoffJobRecord): Promise<void> {
    if (
      record.state.status !== "succeeded" ||
      record.request.response_channel !== "imessage" ||
      !record.state.summary
    ) {
      return;
    }
    const recipientId = await this.resolveRecipient(record);
    if (!recipientId) return;

    await this.channel.send({
      recipientId,
      correlationId: `handoff:${record.job.job_id}:completed`,
      text: formatHandoffReceipt(record.state.summary)
    });
  }
}

function formatHandoffReceipt(
  summary: NonNullable<HandoffJobRecord["state"]["summary"]>
): string {
  const lines = ["今晚的事项已经替你收好。"];
  if (summary.tonight_required.length > 0) {
    lines.push(`今晚需要处理：${summary.tonight_required.length} 项`);
  }
  if (summary.tomorrow.length > 0) {
    lines.push(`明天处理：${summary.tomorrow.length} 项`);
  }
  const drafts = [
    ...summary.tonight_required,
    ...summary.tomorrow
  ].filter((item) => item.draft_saved).length;
  if (drafts > 0) {
    lines.push(`已保存邮件草稿：${drafts} 封（未发送）`);
  }
  if (summary.pause_receipt.tomorrow_first_step) {
    lines.push(
      `明天第一步：${summary.pause_receipt.tomorrow_first_step}`
    );
  }
  lines.push("你可以先休息，邮件不会自动发送。");
  return lines.join("\n");
}
