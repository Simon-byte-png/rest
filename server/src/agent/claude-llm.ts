import Anthropic from "@anthropic-ai/sdk";
import { ZodError, type ZodType } from "zod";
import {
  CONTRACT_VERSION,
  fatigueReflectionSchema,
  restQuestRecommendationSchema,
  type FatigueCheckIn,
  type FatigueReflection,
  type RestQuest,
  type RestQuestRecommendation,
  type RestRecommendationRequest
} from "../domain/contracts.js";
import { AppError } from "../domain/errors.js";
import type {
  AgentLLM,
  HandoffAgentInput,
  HandoffSummaryDraft,
  ProviderHealth
} from "../domain/ports.js";
import { z } from "zod";

const handoffDraftSchema = z
  .object({
    classifications: z.array(
      z
        .object({
          id: z.string(),
          priority: z.enum([
            "tonight_required",
            "tomorrow",
            "no_action",
            "uncertain"
          ]),
          gist: z.string().max(240),
          reason: z.string().max(240),
          suggestedDraft: z.string().max(1000).nullable()
        })
        .strict()
    ),
    tomorrowFirstStep: z.string().max(300).nullable()
  })
  .strict();

export class ClaudeAgentLLM implements AgentLLM {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async health(): Promise<ProviderHealth> {
    return "ready";
  }

  async reflectFatigue(input: FatigueCheckIn): Promise<FatigueReflection> {
    return this.completeJson(
      [
        "You classify a user's self-described tiredness for a rest product.",
        "Return JSON only. Do not diagnose a medical condition.",
        "Allowed fatigue_type: physical, sensory_overload, cognitive_overload, emotional_social, bedtime_arousal, unknown.",
        "Ask at most one follow-up. If follow_up_answer is present, needs_follow_up must be false.",
        `schema_version must be "${CONTRACT_VERSION}" and request_id must be "${input.request_id}".`,
        `Input: ${JSON.stringify(input)}`
      ].join("\n"),
      fatigueReflectionSchema
    );
  }

  async chooseQuest(
    input: RestRecommendationRequest,
    allowedQuests: RestQuest[]
  ): Promise<RestQuestRecommendation> {
    return this.completeJson(
      [
        "Select exactly one quest from the provided fixed library.",
        "Never invent a quest ID, steps, medical advice, or safety advice.",
        `schema_version must be "${CONTRACT_VERSION}", request_id must be "${input.request_id}", content_version must be "${input.content_version}".`,
        `Request: ${JSON.stringify(input)}`,
        `Allowed quests: ${JSON.stringify(
          allowedQuests.map((quest) => ({
            id: quest.id,
            fatigue_types: quest.fatigue_types,
            duration_seconds: quest.duration_seconds,
            energy_required: quest.energy_required,
            location_tags: quest.location_tags
          }))
        )}`
      ].join("\n"),
      restQuestRecommendationSchema
    );
  }

  async summarizeHandoff(
    input: HandoffAgentInput
  ): Promise<HandoffSummaryDraft> {
    return this.completeJson(
      [
        "Classify each provided email for a sleep handoff.",
        "Return JSON only. Every mail ID must appear exactly once.",
        "Allowed priority: tonight_required, tomorrow, no_action, uncertain.",
        "Use tonight_required only when the text contains a concrete reason it cannot wait.",
        "Use uncertain when evidence is insufficient. Never claim a draft was saved.",
        "A suggestedDraft is only proposed text; the application decides whether it is written.",
        `Input: ${JSON.stringify(input)}`
      ].join("\n"),
      handoffDraftSchema
    );
  }

  private async completeJson<T>(
    prompt: string,
    schema: ZodType<T>
  ): Promise<T> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1800,
        temperature: 0,
        messages: [{ role: "user", content: prompt }]
      });
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      const candidate = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      return schema.parse(JSON.parse(candidate));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const invalidOutput =
        error instanceof SyntaxError || error instanceof ZodError;
      throw new AppError({
        code: invalidOutput ? "LLM_INVALID_OUTPUT" : "LLM_TIMEOUT",
        message:
          invalidOutput
            ? "模型返回了无法验证的结构。"
            : "模型服务暂时不可用。",
        statusCode: 503,
        retryable: true,
        fallback: "LOCAL_RULES"
      });
    }
  }
}
