import type { RestFeedback } from "../domain/contracts.js";
import type {
  FeedbackRepository,
  HandoffJobRecord,
  HandoffJobRepository,
  InboundEventDeduplicator,
  IdempotencyStore
} from "../domain/ports.js";

interface ExpiringValue<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryIdempotencyStore<T>
  implements IdempotencyStore<T>
{
  private readonly values = new Map<string, ExpiringValue<T>>();

  async get(key: string): Promise<T | null> {
    const entry = this.values.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.values.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1_000
    });
  }
}

export class InMemoryHandoffJobRepository
  implements HandoffJobRepository
{
  private readonly records = new Map<string, HandoffJobRecord>();

  async create(record: HandoffJobRecord): Promise<void> {
    this.records.set(record.job.job_id, structuredClone(record));
  }

  async get(id: string): Promise<HandoffJobRecord | null> {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }

  async update(
    id: string,
    patch: Partial<HandoffJobRecord>
  ): Promise<void> {
    const existing = this.records.get(id);
    if (!existing) {
      return;
    }
    this.records.set(id, structuredClone({ ...existing, ...patch }));
  }

  async deleteExpired(before: string): Promise<number> {
    const threshold = Date.parse(before);
    let deleted = 0;
    for (const [id, record] of this.records) {
      if (Date.parse(record.updatedAt) < threshold) {
        this.records.delete(id);
        deleted += 1;
      }
    }
    return deleted;
  }
}

export class InMemoryFeedbackRepository implements FeedbackRepository {
  private readonly feedback: RestFeedback[] = [];

  async record(feedback: RestFeedback): Promise<void> {
    this.feedback.push(structuredClone(feedback));
  }

  all(): RestFeedback[] {
    return structuredClone(this.feedback);
  }
}

export class InMemoryInboundEventDeduplicator
  implements InboundEventDeduplicator
{
  private readonly events = new Map<string, number>();

  async claim(eventId: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = this.events.get(eventId);
    if (expiresAt !== undefined && expiresAt > now) {
      return false;
    }
    this.events.set(eventId, now + ttlSeconds * 1_000);
    return true;
  }
}
