import { CannedAgentLLM } from "./agent/canned-llm.js";
import { ClaudeAgentLLM } from "./agent/claude-llm.js";
import { ResilientAgentLLM } from "./agent/resilient-llm.js";
import type { ServerDependencies } from "./api/create-server.js";
import { HandoffService } from "./application/handoff/handoff-service.js";
import { RestService } from "./application/rest/rest-service.js";
import type { AppConfig } from "./config.js";
import { FileRestContentRepository } from "./content/file-rest-content-repository.js";
import {
  InMemoryFeedbackRepository,
  InMemoryHandoffJobRepository,
  InMemoryIdempotencyStore
} from "./infra/in-memory.js";
import {
  FixtureMailProvider,
  NoopHandoffCompletionSink,
  UnavailableMailProvider
} from "./infra/provider-stubs.js";
import { RandomIdGenerator, SystemClock } from "./infra/system.js";

export function buildServerDependencies(
  config: AppConfig
): ServerDependencies {
  const content = new FileRestContentRepository();
  const localAgent = new CannedAgentLLM();
  const realAgent =
    config.CLAUDE_API_KEY && config.CLAUDE_MODEL
      ? new ResilientAgentLLM(
          new ClaudeAgentLLM(
            config.CLAUDE_API_KEY,
            config.CLAUDE_MODEL
          ),
          localAgent
        )
      : localAgent;
  const realMail = new UnavailableMailProvider();
  const demoMail = new FixtureMailProvider();
  const completionSink = new NoopHandoffCompletionSink();
  const clock = new SystemClock();
  const ids = new RandomIdGenerator();

  return {
    config,
    rest: new RestService(
      realAgent,
      content,
      new InMemoryFeedbackRepository(),
      new InMemoryIdempotencyStore<boolean>()
    ),
    demoRest: new RestService(
      localAgent,
      content,
      new InMemoryFeedbackRepository(),
      new InMemoryIdempotencyStore<boolean>()
    ),
    handoff: new HandoffService(
      new InMemoryHandoffJobRepository(),
      new InMemoryIdempotencyStore<string>(),
      realMail,
      realAgent,
      completionSink,
      clock,
      ids
    ),
    demoHandoff: new HandoffService(
      new InMemoryHandoffJobRepository(),
      new InMemoryIdempotencyStore<string>(),
      demoMail,
      localAgent,
      completionSink,
      clock,
      ids
    ),
    providerHealth: async () => ({
      agent: await realAgent.health(),
      gmail: await realMail.health(),
      rest_content: "ready",
      handoff_jobs: "ready"
    })
  };
}
