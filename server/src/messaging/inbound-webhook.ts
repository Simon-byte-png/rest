import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../domain/errors.js";
import type {
  InboundMessage,
  InboundMessageMapper
} from "../domain/ports.js";

export interface MessagingWebhookPayload {
  event_id: string;
  message_id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  received_at: string;
}

export interface WebhookSignatureVerifier {
  verify(rawBody: string, signature: string | undefined): void;
}

export class HmacWebhookSignatureVerifier
  implements WebhookSignatureVerifier
{
  constructor(private readonly secret: string) {}

  verify(rawBody: string, signature: string | undefined): void {
    const supplied = normalizeSignature(signature);
    const expected = createHmac("sha256", this.secret)
      .update(rawBody)
      .digest("hex");
    const valid =
      supplied !== null &&
      supplied.length === expected.length &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    if (!valid) {
      throw new AppError({
        code: "PHOTON_SIGNATURE_INVALID",
        message: "消息 webhook 签名无效。",
        statusCode: 401,
        retryable: false
      });
    }
  }
}

export class MessagingWebhookMapper
  implements InboundMessageMapper<MessagingWebhookPayload>
{
  map(payload: MessagingWebhookPayload): InboundMessage {
    if (
      !isNonEmpty(payload.event_id) ||
      !isNonEmpty(payload.message_id) ||
      !isNonEmpty(payload.sender_id) ||
      !isNonEmpty(payload.recipient_id) ||
      typeof payload.text !== "string" ||
      !isNonEmpty(payload.received_at) ||
      Number.isNaN(Date.parse(payload.received_at))
    ) {
      throw new AppError({
        code: "INVALID_REQUEST",
        message: "入站消息无法映射为标准事件。",
        statusCode: 400,
        retryable: false
      });
    }
    return {
      eventId: payload.event_id,
      providerMessageId: payload.message_id,
      senderId: payload.sender_id,
      recipientId: payload.recipient_id,
      text: payload.text,
      receivedAt: payload.received_at
    };
  }
}

function normalizeSignature(signature: string | undefined): string | null {
  if (!signature) return null;
  const value = signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature;
  return /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : null;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
