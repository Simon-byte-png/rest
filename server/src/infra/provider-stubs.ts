import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "../domain/errors.js";
import type {
  DraftRequest,
  DraftResult,
  HandoffCompletionSink,
  HandoffJobRecord,
  MailFetchContext,
  MailItem,
  MailProvider,
  ProviderHealth
} from "../domain/ports.js";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));

export class UnavailableMailProvider implements MailProvider {
  async health(): Promise<ProviderHealth> {
    return "unavailable";
  }

  async fetchUnread(_context: MailFetchContext): Promise<MailItem[]> {
    throw new AppError({
      code: "GMAIL_NOT_CONNECTED",
      message: "Gmail 尚未连接。",
      statusCode: 503,
      retryable: true,
      fallback: "OPEN_LOOPS_ONLY"
    });
  }

  async createDraft(_request: DraftRequest): Promise<DraftResult> {
    throw new AppError({
      code: "GMAIL_NOT_CONNECTED",
      message: "Gmail 尚未连接。",
      statusCode: 503,
      retryable: true,
      fallback: "SUMMARY_ONLY"
    });
  }
}

export class FixtureMailProvider implements MailProvider {
  private readonly items: MailItem[];
  private readonly drafts = new Map<string, DraftResult>();

  constructor(path?: string) {
    const fixturePath =
      path ??
      resolve(
        sourceDirectory,
        "../../../contracts/fixtures/mail-items-demo.json"
      );
    this.items = JSON.parse(readFileSync(fixturePath, "utf8")) as MailItem[];
  }

  async health(): Promise<ProviderHealth> {
    return "ready";
  }

  async fetchUnread(_context: MailFetchContext): Promise<MailItem[]> {
    return structuredClone(this.items);
  }

  async createDraft(request: DraftRequest): Promise<DraftResult> {
    const existing = this.drafts.get(request.dedupeKey);
    if (existing) {
      return structuredClone(existing);
    }
    const result = { draftId: `fixture-draft-${this.drafts.size + 1}` };
    this.drafts.set(request.dedupeKey, result);
    return structuredClone(result);
  }
}

export class NoopHandoffCompletionSink
  implements HandoffCompletionSink
{
  async notify(_record: HandoffJobRecord): Promise<void> {
    // W2 supplies the Photon-backed implementation.
  }
}
