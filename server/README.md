# Hush Server

W1/P2 owns the API boundary, Agent orchestration, Rest application service,
Handoff Job state machine, contracts implementation, bootstrap, and provider
ports and the final Composition Root. Gmail Owner owns only Gmail/OAuth
adapters. W2/P3 owns only Photon messaging and webhook adapters.

Business routes call application services. They never call Gmail, Photon, or
Claude SDKs directly.

## Toolchain

- Node.js 20.x
- pnpm 9.x
- TypeScript 5.9
- Fastify 5
- Zod 4
- Vitest 3

The package deliberately rejects unsupported major Node/pnpm versions through
`engines`. Local commands can still be inspected on newer Node versions, but
the demo and deployment environment should use Node 20.

## Start

From the repository root, copy `.env.example` to `.env`, then:

```powershell
cd server
corepack pnpm install
corepack pnpm dev
```

The server listens on `PORT` (default `3000`). `GET /v1/health` does not require
client headers. All other W1 routes require:

```text
X-Request-ID
X-Client-Version
X-Contract-Version: 1.0
```

The body `request_id` must equal `X-Request-ID`. Mutating idempotent routes also
require `Idempotency-Key`.

## Commands

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm check
```

`test:contracts` validates fixtures and local OpenAPI references. Integration
tests use Fastify injection, so they do not need a listening TCP port.

## Current provider behavior

- Without both `CLAUDE_API_KEY` and `CLAUDE_MODEL`, Agent calls use the local
  deterministic fallback.
- Until Gmail Owner supplies a Gmail adapter, the real Handoff path completes with
  user-submitted open loops only and explicitly marks Gmail as unavailable.
- A valid demo token switches to fixture mail and canned Agent behavior.
- Sample responses carry `X-Hush-Data-Origin: mock`; normal responses carry
  `real`.

## Provider integration points

Provider Owners implement W1-owned interfaces from `src/domain/ports.ts`
without modifying that file:

- Gmail Owner implements `MailProvider`: Gmail health, unread fetch, and
  idempotent draft creation.
- W2 implements `MessagingChannel`, inbound mapping, and Photon-backed
  completion delivery.

Gmail-specific code stays under `src/mail/`; Photon code stays under
`src/messaging/`. Each Owner exports factories or registration functions. W1
wires those exports in `src/composition.ts` after review.

The Gmail adapter must honor `DraftRequest.dedupeKey`. It must never send mail;
`createDraft` only creates or returns an existing draft.
