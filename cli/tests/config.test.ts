import { describe, it, expect } from "vitest";
import { parseConfig, CONFIG_SCHEMA_VERSION } from "../src/config/config.ts";

describe("parseConfig", () => {
  it("accepts a valid map.config.json", () => {
    const config = parseConfig(
      JSON.stringify({
        version: CONFIG_SCHEMA_VERSION,
        project: { name: "demo", createdAt: "2026-01-01T00:00:00.000Z", languages: ["typescript"] },
        analysis: { analyzers: ["typescript"], include: ["src/**"], exclude: [] },
        registry: { source: "default" },
      }),
    );
    expect(config.version).toBe(CONFIG_SCHEMA_VERSION);
    expect(config.project.name).toBe("demo");
  });

  it("rejects non-objects, missing versions, and future versions", () => {
    expect(() => parseConfig("[]")).toThrow(/JSON object/);
    expect(() => parseConfig("{}")).toThrow(/version/);
    expect(() => parseConfig('{"version": 99}')).toThrow(/newer than/);
    expect(() => parseConfig("{nope")).toThrow();
  });
});
