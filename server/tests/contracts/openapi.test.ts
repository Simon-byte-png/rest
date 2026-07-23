import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDirectory, "../../..");
const openApiPath = resolve(repositoryRoot, "contracts/openapi.yaml");

describe("OpenAPI contract", () => {
  it("parses and points only to existing local schema files", () => {
    const document = parse(readFileSync(openApiPath, "utf8")) as unknown;
    const references = collectReferences(document).filter(
      (reference) => !reference.startsWith("#")
    );

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      const [relativePath] = reference.split("#");
      expect(relativePath).toBeTruthy();
      expect(() =>
        readFileSync(resolve(dirname(openApiPath), relativePath!), "utf8")
      ).not.toThrow();
    }
  });
});

function collectReferences(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectReferences);
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const object = value as Record<string, unknown>;
  return [
    ...(typeof object.$ref === "string" ? [object.$ref] : []),
    ...Object.values(object).flatMap(collectReferences)
  ];
}
