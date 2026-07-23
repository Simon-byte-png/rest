# W1 / P2 Backend Foundation

Status: initialized and executable.

## Delivered boundaries

W1 owns:

- `server/src/api/`
- `server/src/application/`
- `server/src/domain/`
- `server/src/agent/`
- `server/src/jobs/`
- `server/src/content/`
- `server/src/infra/`
- `server/src/bootstrap.ts`
- `server/src/composition.ts`
- `contracts/` after contract-change approval

Gmail Owner owns:

- `server/src/mail/`
- Gmail OAuth and token storage

W2 owns:

- `server/src/messaging/`
- Photon webhook and outbound delivery

W1 defines provider interfaces and owns final composition. Gmail Owner
implements only Gmail adapters; W2 implements only Photon/Messaging adapters.

## Implemented infrastructure

1. Fastify application factory and a side-effect-only bootstrap.
2. Required request, client, contract, idempotency, and demo headers.
3. Unified structured error responses and redacted logs.
4. Zod runtime models mirroring Contract v1.
5. JSON Schema fixture validation and OpenAPI local-reference validation.
6. Deterministic Rest evaluation and fixed-library Quest selection.
7. Claude adapter with schema validation and deterministic fallback.
8. In-memory idempotency, feedback, and Handoff Job repositories.
9. Asynchronous Handoff Job stages, cancellation, polling, and terminal states.
10. Gmail-unavailable degradation to `OPEN_LOOPS_ONLY`.
11. Real/Mock service graphs selected by a protected demo token.
12. Type, unit, contract, and integration test scaffolding.

## Handoff state machine

```text
queued
  -> fetching_mail
  -> classifying
  -> creating_drafts
  -> preparing_receipt
  -> completed

Any non-terminal state -> cancelled
Unexpected processing failure -> failed
Gmail unavailable -> continue without Gmail -> completed
```

The Agent only proposes classification and draft text. Application code:

- verifies that every input mail has exactly one classification;
- converts missing classifications to `uncertain`;
- decides whether a draft may be created;
- records whether the provider actually saved the draft;
- builds the coverage-limited Pause Receipt.

## Provider contract for W2

`MailProvider.fetchUnread` returns normalized `MailItem` objects. It throws a
typed `AppError` for provider failures. Handoff catches provider failure and
continues with open loops.

`MailProvider.createDraft` must be idempotent by `dedupeKey`. Returning an
existing Gmail draft is valid. Sending mail is outside the contract.

`HandoffCompletionSink.notify` is called only after the repository contains a
successful terminal record and only when `response_channel` is `imessage`.

W2 must not change public domain types directly. Required changes use
`CONTRACT-CHANGE` and need W1 plus M1 approval.

## Runtime limitations for the hackathon

- Job and idempotency state are process-local and disappear on restart.
- No multi-instance coordination is provided.
- No production database or external queue is initialized.
- The local fallback is intentionally conservative and not a replacement for
  long-term model evaluation.
- Gmail and Photon remain unavailable until their separate Provider Owners
  deliver adapters and W1 wires them.

These are explicit MVP boundaries, not hidden production claims.

## W1-04 Mock Vertical Slice

The vertical slice uses the real Fastify server, HTTP routes, application
services, in-memory repositories, and composition root. Tests inject
`CannedAgentLLM`, local Mail providers, and a
`RecordingMessagingChannel`; no Gmail or Photon adapter is required.

Run only the vertical slice:

```powershell
cd server
pnpm test:vertical
```

Run the complete backend verification:

```powershell
cd server
pnpm typecheck
pnpm test
pnpm build
```

Run an already-started local server through real network requests:

```powershell
.\scripts\smoke-w1-vertical-slice.ps1
```

For Sample Mode, start the server with `HUSH_DEMO_MODE=true` and a private
`HUSH_DEMO_TOKEN`, then pass the same value with `-DemoToken`. The script
contains no token.

Cancellation is currently cooperative at application-stage boundaries. The
Job becomes `cancelled` immediately and cannot later become `succeeded`, but
the active Agent or Mail provider call is not aborted because the current
application service does not pass an `AbortSignal` into those calls. Changing
that behavior requires a separate, reviewed runtime change; Contract v1 was
not changed by W1-04.
