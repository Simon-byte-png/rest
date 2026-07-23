import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  restQuestSchema,
  type RestQuest
} from "../domain/contracts.js";
import type { RestContentRepository } from "../domain/ports.js";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));

export class FileRestContentRepository implements RestContentRepository {
  private readonly items: RestQuest[];
  private readonly byId: Map<string, RestQuest>;

  constructor(path?: string) {
    const canonicalPath = resolve(
      sourceDirectory,
      "../../../content/rest-quests.json"
    );
    const samplePath = resolve(
      sourceDirectory,
      "../../../content/rest-quests.sample.json"
    );
    const raw = JSON.parse(
      readFileSync(path ?? safeExistingPath(canonicalPath, samplePath), "utf8")
    ) as unknown;
    this.items = restQuestSchema.array().parse(raw);
    this.byId = new Map(this.items.map((item) => [item.id, item]));
  }

  contentVersion(): string {
    return this.items[0]?.content_version ?? "0.0.0";
  }

  quests(): RestQuest[] {
    return structuredClone(this.items);
  }

  questById(id: string): RestQuest | undefined {
    const quest = this.byId.get(id);
    return quest ? structuredClone(quest) : undefined;
  }
}

function safeExistingPath(canonicalPath: string, samplePath: string): string {
  try {
    readFileSync(canonicalPath);
    return canonicalPath;
  } catch {
    return samplePath;
  }
}
