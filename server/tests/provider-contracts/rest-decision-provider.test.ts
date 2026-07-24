import { describe, expect, it } from "vitest";
import {
  CannedRestDecisionProvider,
  UnavailableRestDecisionProvider
} from "../../src/agent/rest-decision-providers.js";
import { FileRestContentRepository } from "../../src/content/file-rest-content-repository.js";
import type { RestDecisionContext } from "../../src/domain/ports.js";

const content = new FileRestContentRepository();

const context = (
  overrides: Partial<RestDecisionContext> = {}
): RestDecisionContext => ({
  requestId: "req_provider_contract",
  measuredAt: "2026-07-24T04:00:00Z",
  platform: "ios",
  triggerSource: "device_activity_threshold",
  monitoredScope: {
    userProvidedContextLabel: "用户命名",
    labelIsUserSupplied: true,
    rawAppIdentityAvailable: false,
    websiteDomain: null
  },
  usage: {
    dailyUsageMinutes: 35,
    estimatedContinuousUsageMinutes: 30,
    continuousUsageIsEstimated: true,
    sourceFormat: "current"
  },
  appSwitchesLast10Minutes: null,
  localHour: 14,
  minutesSinceLastRest: 180,
  selfReportedEnergy: null,
  recentFeedback: [],
  outputConstraints: {
    maximumMessageCharacters: 240,
    mayControlDevice: false,
    mayChangeNextThreshold: false
  },
  ...overrides
});

describe("RestDecisionProvider contract", () => {
  it("exposes Canned as a ready mock Provider", async () => {
    const provider = new CannedRestDecisionProvider(content);

    expect(provider.dataOrigin).toBe("mock");
    await expect(provider.health()).resolves.toBe("ready");
  });

  it("returns deterministic Canned decisions", async () => {
    const provider = new CannedRestDecisionProvider(content);

    await expect(provider.decide(context())).resolves.toEqual(
      await provider.decide(context())
    );
  });

  it("selects a Quest only from the fixed repository", async () => {
    const provider = new CannedRestDecisionProvider(content);
    const candidate = await provider.decide(context());

    expect(candidate.defaultQuestId).toBeTruthy();
    expect(content.questById(candidate.defaultQuestId!)).toBeDefined();
  });

  it("exposes Unavailable as unavailable mock infrastructure", async () => {
    const provider = new UnavailableRestDecisionProvider();

    expect(provider.dataOrigin).toBe("mock");
    await expect(provider.health()).resolves.toBe("unavailable");
    await expect(provider.decide(context())).rejects.toThrow(
      "Rest Decision Provider is unavailable."
    );
  });
});
