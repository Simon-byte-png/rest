import type {
  FatigueCheckIn,
  FatigueReflection,
  RestQuest,
  RestQuestRecommendation,
  RestRecommendationRequest
} from "../domain/contracts.js";
import type {
  AgentLLM,
  HandoffAgentInput,
  HandoffSummaryDraft,
  ProviderHealth
} from "../domain/ports.js";

export class ResilientAgentLLM implements AgentLLM {
  constructor(
    private readonly primary: AgentLLM,
    private readonly fallback: AgentLLM
  ) {}

  async health(): Promise<ProviderHealth> {
    const health = await this.primary.health();
    return health === "ready" ? "ready" : "degraded";
  }

  async reflectFatigue(input: FatigueCheckIn): Promise<FatigueReflection> {
    return this.withFallback(
      () => this.primary.reflectFatigue(input),
      () => this.fallback.reflectFatigue(input)
    );
  }

  async chooseQuest(
    input: RestRecommendationRequest,
    allowedQuests: RestQuest[]
  ): Promise<RestQuestRecommendation> {
    return this.withFallback(
      () => this.primary.chooseQuest(input, allowedQuests),
      () => this.fallback.chooseQuest(input, allowedQuests)
    );
  }

  async summarizeHandoff(
    input: HandoffAgentInput
  ): Promise<HandoffSummaryDraft> {
    return this.withFallback(
      () => this.primary.summarizeHandoff(input),
      () => this.fallback.summarizeHandoff(input)
    );
  }

  private async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    try {
      return await primary();
    } catch {
      return fallback();
    }
  }
}
