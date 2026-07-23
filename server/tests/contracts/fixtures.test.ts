import { describe, expect, it } from "vitest";
import {
  FIXTURE_CONTRACTS,
  createContractValidator
} from "../../src/infra/contract-validator.js";

describe("contract fixtures", () => {
  const validator = createContractValidator();

  for (const contract of FIXTURE_CONTRACTS) {
    it(`${contract.fixture} matches ${contract.schema}`, () => {
      const result = validator.validateFixture(contract);
      expect(result.errors, JSON.stringify(result.errors, null, 2)).toBeNull();
      expect(result.valid).toBe(true);
    });
  }
});
