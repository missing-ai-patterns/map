import { describe, it, expect } from "vitest";
import {
  parseConfig,
  CONFIG_SCHEMA_VERSION,
  DEFAULT_SOURCES,
  DEFAULT_TARGETS,
} from "../src/config/config.ts";

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

  it("parses optional compiler sources and targets", () => {
    const config = parseConfig(
      JSON.stringify({
        version: CONFIG_SCHEMA_VERSION,
        project: { name: "demo", createdAt: "2026-01-01T00:00:00.000Z", languages: [] },
        analysis: { analyzers: [], include: [], exclude: [] },
        registry: { source: "default" },
        sources: ["project.md", "patterns/**/*.md"],
        targets: { claude: { output: "CLAUDE.md" } },
      }),
    );
    expect(config.sources).toEqual(["project.md", "patterns/**/*.md"]);
    expect(config.targets?.claude).toEqual({ output: "CLAUDE.md" });
  });

  it("keeps a v2 config valid (no sources/targets)", () => {
    const config = parseConfig(
      JSON.stringify({
        version: 2,
        project: { name: "demo", createdAt: "2026-01-01T00:00:00.000Z", languages: [] },
        analysis: { analyzers: [], include: [], exclude: [] },
        registry: { source: "default" },
      }),
    );
    expect(config.sources).toBeUndefined();
    expect(config.targets).toBeUndefined();
  });

  it("exposes sensible compiler defaults", () => {
    expect(DEFAULT_SOURCES).toContain("**/*.md");
    expect(DEFAULT_TARGETS.claude?.output).toBe("CLAUDE.md");
    expect(Object.keys(DEFAULT_TARGETS)).toContain("cursor");
  });
});
