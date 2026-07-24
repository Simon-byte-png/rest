import type { FastifyInstance } from "fastify";
import { AppError } from "../domain/errors.js";
import type {
  InboundEventDeduplicator,
  InboundMessage,
  InboundMessageMapper
} from "../domain/ports.js";
import type {
  MessagingWebhookPayload,
  WebhookSignatureVerifier
} from "./inbound-webhook.js";

export interface MessagingRouteDependencies {
  verifier: WebhookSignatureVerifier;
  mapper: InboundMessageMapper<MessagingWebhookPayload>;
  deduplicator: InboundEventDeduplicator;
  onMessage(message: InboundMessage): Promise<void>;
  dedupeTtlSeconds?: number;
}

/**
 * Exported for W1 to mount in the composition root. The default parser
 * re-serializes JSON; a real provider integration should install a raw-body
 * parser so signature verification uses the exact bytes received.
 */
export async function registerMessagingRoutes(
  server: FastifyInstance,
  dependencies: MessagingRouteDependencies
): Promise<void> {
  server.post<{ Body: MessagingWebhookPayload }>(
    "/v1/webhooks/photon",
    async (request, reply) => {
      try {
        const signatureHeader = request.headers["x-photon-signature"];
        const signature = Array.isArray(signatureHeader)
          ? signatureHeader[0]
          : signatureHeader;
        dependencies.verifier.verify(
          JSON.stringify(request.body),
          signature
        );
        const message = dependencies.mapper.map(request.body);
        const claimed = await dependencies.deduplicator.claim(
          message.eventId,
          dependencies.dedupeTtlSeconds ?? 86_400
        );
        if (claimed) {
          await dependencies.onMessage(message);
        }
        return reply.code(202).send();
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: {
              code: error.code,
              message: error.message,
              retryable: error.retryable,
              fallback: error.fallback,
              details: null
            }
          });
        }
        throw error;
      }
    }
  );
}
