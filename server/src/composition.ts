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
  type AgentLLM,
  type HandoffCompletionSink,
  type MailProvider,
  type MessagingChannel
} from "./domain/ports.js";
import {
  ConsoleMessagingChannel,
  FixtureMailProvider,
  MessagingHandoffCompletionSink,
  NoopHandoffCompletionSink,
  UnavailableMailProvider
} from "./infra/provider-stubs.js";
import { RandomIdGenerator, SystemClock } from "./infra/system.js";

export interface ServerCompositionOverrides {
  realAgent?: AgentLLM;
  demoAgent?: AgentLLM;
  realMail?: MailProvider;
  demoMail?: MailProvider;
  messagingChannel?: MessagingChannel;
  completionSink?: HandoffCompletionSink;
  completionRecipientId?: string;
}

export function buildServerDependencies(
  config: AppConfig,
  overrides: ServerCompositionOverrides = {}
): ServerDependencies {
  const content = new FileRestContentRepository();
  const localAgent = new CannedAgentLLM();
  const realAgent =
    overrides.realAgent ??
    (config.CLAUDE_API_KEY && config.CLAUDE_MODEL
      ? new ResilientAgentLLM(
          new ClaudeAgentLLM(
            config.CLAUDE_API_KEY,
            config.CLAUDE_MODEL
          ),
          localAgent
        )
      : localAgent);
  const demoAgent = overrides.demoAgent ?? localAgent;
  const realMail = overrides.realMail ?? new UnavailableMailProvider();
  const demoMail = overrides.demoMail ?? new FixtureMailProvider();
  const messaging =
    overrides.messagingChannel ?? new ConsoleMessagingChannel();
  const completionSink =
    overrides.completionSink ??
    (overrides.completionRecipientId
      ? new MessagingHandoffCompletionSink(
          messaging,
          overrides.completionRecipientId
        )
      : new NoopHandoffCompletionSink());
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
      demoAgent,
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
      demoAgent,
      completionSink,
      clock,
      ids
    ),
    providerHealth: async () => ({
      agent: await realAgent.health(),
      gmail: await realMail.health(),
      messaging_fallback: await messaging.health(),
      rest_content: "ready",
      handoff_jobs: "ready"
    })
  };
}
