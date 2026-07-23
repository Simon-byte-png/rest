# W2 / P3 Messaging Architecture

## Status

This package implements the provider boundary and local contract coverage. It
does **not** claim that Photon is connected. Photon-specific wire formats,
credentials, QR generation, and sandbox verification are intentionally
deferred because the product may use another iMessage relay.

## Data flow

```text
Gmail Provider -> HandoffService -> HandoffSummary
                                      |
                                      v
                       MessagingHandoffCompletionSink
                                      |
                                      v
                         MessagingChannel protocol
                                      |
                         HttpMessagingChannel
                                      |
                  Photon or another iMessage relay
```

The Gmail side may fetch authorized messages and save drafts. It never sends
mail. The messaging side only receives the resulting summary and reports draft
counts as “saved, not sent”. This follows the Inbox Zero architectural pattern
of keeping provider access, automation decisions, and outbound actions
separate, without importing its code or dependencies.

Inbound messages use the reverse boundary:

```text
webhook -> signature verifier -> provider payload mapper
        -> event deduplicator -> W1-owned intent/application callback
```

## W1 integration

W1 owns the composition root and should:

1. Construct `HttpMessagingChannel` only when a relay is configured.
2. Construct `MessagingHandoffCompletionSink` with a recipient resolver backed
   by Hush account linkage. The current handoff contract intentionally contains
   no phone number or provider recipient ID.
3. Mount `registerMessagingRoutes()` and provide the W1-owned inbound intent
   callback.
4. Install a raw-body parser before enabling a real webhook. Provider
   signatures must be verified against the exact request bytes, not parsed and
   re-serialized JSON.
5. Keep the existing unavailable/no-op implementations as the `APP_ONLY`
   fallback.

No changes to `composition.ts`, `bootstrap.ts`, domain ports, application
services, contracts, or package dependencies are included in the W2 branch.

## Provider configuration

The generic HTTP channel accepts:

- relay endpoint
- bearer credential
- optional line ID
- finite timeout

For Photon compatibility these values can be sourced by W1 from the existing
`PHOTON_API_KEY`, `PHOTON_LINE_ID`, and `PHOTON_WEBHOOK_SECRET` settings.
Another relay can use its own configuration without changing application
services.

The relay request contains only:

```json
{
  "recipient_id": "provider-owned-reference",
  "text": "normalized outbound message",
  "correlation_id": "stable-idempotency-key",
  "line_id": "optional-line"
}
```

The correlation ID is also sent as `Idempotency-Key`. Retries must reuse it.

## Security and privacy

- Webhook HMAC is checked before payload mapping or callback execution.
- Stable provider event IDs are claimed before intent handling.
- Secrets, phone numbers, and message text are not logged.
- Provider errors expose no raw response or secret details.
- A pre-aborted send performs no network request.
- Timeout and provider failures map to retryable `PHOTON_UNAVAILABLE` with
  `APP_ONLY` fallback, as required by Contract v1.

## Verification

From `server/`:

```bash
corepack pnpm typecheck
corepack pnpm vitest run tests/integration/photon-provider.test.ts
corepack pnpm check
```

The integration file imports W1's frozen messaging provider contract runner.
It uses fakes and does not call Photon or another external relay.
