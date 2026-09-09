import { describe, it, expect } from "vitest";
import { parseRegistry, SUPPORTED_SCHEMA_VERSION } from "../src/index.ts";

function registryJson(patterns: ReadonlyArray<Record<string, unknown>>): string {
  return JSON.stringify({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: { repository: "https://example.com/map", version: "0.0.0-test" },
    categories: ["retrieval", "observability"],
    patterns,
  });
}

const PATTERNS = [
  {
    id: "retrieval/chunking",
    name: "Chunking",
    category: "retrieval",
    status: "published",
    summary: "Split documents into smaller units.",
    score: { complexity: 2, latency: 5, cost: 5, accuracyImpact: 5, productionReadiness: 5 },
    files: { "prompt.md": "# Prompt", "acceptance.md": "# Acceptance" },
  },
  { id: "retrieval/semantic-cache", name: "Semantic Cache", category: "retrieval", status: "planned" },
  { id: "observability/tracing", name: "Tracing / Spans", category: "observability", status: "planned" },
];

describe("parseRegistry", () => {
  it("parses a valid document", () => {
    const registry = parseRegistry(registryJson(PATTERNS));
    expect(registry.schemaVersion).toBe(1);
    expect(registry.source.version).toBe("0.0.0-test");
    expect(registry.patterns).toHaveLength(3);
    expect(registry.patterns[0]?.files?.["prompt.md"]).toBe("# Prompt");
  });

  it("derives categories from patterns when the field is absent", () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      source: { repository: "r", version: "1" },
      patterns: PATTERNS,
    });
    const registry = parseRegistry(json);
    expect([...registry.categories].sort()).toEqual(["observability", "retrieval"]);
  });

  it("rejects invalid JSON, missing fields, and future schema versions", () => {
    expect(() => parseRegistry("{nope")).toThrow(/not valid JSON/);
    expect(() => parseRegistry("[]")).toThrow(/JSON object/);
    expect(() => parseRegistry("{}")).toThrow(/schemaVersion/);
    expect(() =>
      parseRegistry('{"schemaVersion": 99, "source": {"repository": "r", "version": "1"}, "patterns": []}'),
    ).toThrow(/newer than/);
    expect(() => parseRegistry('{"schemaVersion": 1, "patterns": []}')).toThrow(/source/);
    expect(() =>
      parseRegistry('{"schemaVersion": 1, "source": {"repository": "r", "version": "1"}, "patterns": [{"id": "x"}]}'),
    ).toThrow(/without id\/name\/category\/status/);
  });
});
