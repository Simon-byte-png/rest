import { AppError } from "../domain/errors.js";
import type {
  MessagingChannel,
  OutboundMessage,
  ProviderCallOptions,
  ProviderHealth
} from "../domain/ports.js";

export interface HttpMessagingChannelConfig {
  endpoint: string;
  authorizationToken: string;
  lineId?: string;
  timeoutMs?: number;
}

export type MessagingFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

/**
 * Provider-neutral HTTP transport for an iMessage relay.
 *
 * Photon can be configured as one relay, but no Photon payload or SDK type
 * escapes this adapter. A future relay only needs to accept this small wire
 * request or provide another MessagingChannel implementation.
 */
export class HttpMessagingChannel implements MessagingChannel {
  private readonly timeoutMs: number;

  constructor(
    private readonly config: HttpMessagingChannelConfig,
    private readonly request: MessagingFetch = fetch
  ) {
    this.timeoutMs = config.timeoutMs ?? 8_000;
  }

  async health(): Promise<ProviderHealth> {
    try {
      const response = await this.request(this.config.endpoint, {
        method: "HEAD",
        headers: this.headers("health"),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
      if (response.ok) return "ready";
      return response.status >= 500 ? "unavailable" : "degraded";
    } catch {
      return "unavailable";
    }
  }

  async send(
    message: OutboundMessage,
    options?: ProviderCallOptions
  ): Promise<void> {
    if (options?.signal?.aborted) {
      throw unavailable("消息发送已取消。");
    }

    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = options?.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;

    try {
      const response = await this.request(this.config.endpoint, {
        method: "POST",
        headers: this.headers(message.correlationId),
        body: JSON.stringify({
          recipient_id: message.recipientId,
          text: message.text,
          correlation_id: message.correlationId,
          ...(this.config.lineId ? { line_id: this.config.lineId } : {})
        }),
        signal
      });
      if (!response.ok) {
        throw unavailable("消息渠道暂时不可用。");
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw unavailable("消息渠道暂时不可用。", error);
    }
  }

  private headers(correlationId: string): Record<string, string> {
    return {
      authorization: `Bearer ${this.config.authorizationToken}`,
      "content-type": "application/json",
      "idempotency-key": correlationId
    };
  }
}

function unavailable(message: string, cause?: unknown): AppError {
  return new AppError({
    code: "PHOTON_UNAVAILABLE",
    message,
    statusCode: 503,
    retryable: true,
    fallback: "APP_ONLY",
    cause
  });
}
