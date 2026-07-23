import { randomUUID } from "node:crypto";
import type { Clock, IdGenerator } from "../domain/ports.js";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class RandomIdGenerator implements IdGenerator {
  next(prefix: string): string {
    return `${prefix}_${randomUUID()}`;
  }
}
