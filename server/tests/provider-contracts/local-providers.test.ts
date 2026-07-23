import { describe, expect, it } from "vitest";
import {
  ConsoleMessagingChannel,
  FixtureMailProvider,
  RecordingMessagingChannel
} from "../../src/infra/provider-stubs.js";

describe("local provider implementations", () => {
  it("FixtureMailProvider deduplicates draft creation", async () => {
    const provider = new FixtureMailProvider();
    const request = {
      forItemId: "local-mail-1",
      threadId: "local-thread-1",
      to: "receiver@example.com",
      subject: "Re: Local test",
      bodyText: "Draft body.",
      dedupeKey: "local-dedupe-1"
    };

    const first = await provider.createDraft(request);
    const second = await provider.createDraft(request);
    expect(second.draftId).toBe(first.draftId);
  });

  it("RecordingMessagingChannel captures complete outbound messages", async () => {
    const provider = new RecordingMessagingChannel();
    const message = {
      recipientId: "local-recipient",
      text: "Local mock message.",
      correlationId: "local-correlation"
    };

    await provider.send(message);
    expect(provider.sent()).toEqual([message]);
  });

  it("ConsoleMessagingChannel writes metadata without message text", async () => {
    const output: string[] = [];
    const provider = new ConsoleMessagingChannel((line) => {
      output.push(line);
    });

    await provider.send({
      recipientId: "local-recipient",
      text: "Sensitive local message.",
      correlationId: "local-correlation"
    });

    expect(output).toHaveLength(1);
    expect(output[0]).toContain('"text_length":24');
    expect(output[0]).not.toContain("Sensitive local message.");
  });
});
