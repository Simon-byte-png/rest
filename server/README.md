# Hush Server

Owner split:

- W1: API, Agent, Gmail, Handoff Job, contracts implementation, bootstrap.
- W2: Photon messaging adapter, webhook, CI/deployment.

Business routes must call application services, not provider SDKs directly.

Recommended scripts to add:

```json
{
  "scripts": {
    "dev": "tsx watch src/bootstrap.ts",
    "test": "vitest run",
    "test:contracts": "vitest run tests/contracts",
    "typecheck": "tsc --noEmit"
  }
}
```
