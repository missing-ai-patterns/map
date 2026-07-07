import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/cli/runner.ts";
import { createDefaultServices } from "../src/services.ts";
import { FileSystemStorage } from "../src/storage/index.ts";
import {
  MarkdownKnowledgeBase,
  parsePatternYaml,
} from "../src/knowledge/index.ts";
import type { Reporter } from "../src/reporting/index.ts";

const CHUNKING_YAML = `# comment
id: retrieval/chunking
name: Chunking
category: retrieval
slug: chunking
maturity: established
summary: >
  Split documents into smaller units
  so retrieval finds the right passage.
score:
  complexity: 2
  latency: 5
  cost: 5
  accuracyImpact: 5
  productionReadiness: 5
related:
  - retrieval/reranking
reference_implementations:
  - reference/python/retrieval/chunking/
`;

describe("parsePatternYaml", () => {
  it("parses scalars, folded strings, lists, and nested maps", () => {
    const doc = parsePatternYaml(CHUNKING_YAML);
    expect(doc["id"]).toBe("retrieval/chunking");
    expect(doc["summary"]).toBe(
      "Split documents into smaller units so retrieval finds the right passage.",
    );
    expect(doc["score"]).toEqual({
      complexity: 2,
      latency: 5,
      cost: 5,
      accuracyImpact: 5,
      productionReadiness: 5,
    });
    expect(doc["related"]).toEqual(["retrieval/reranking"]);
  });

  it("strips inline comments and parses scalar types", () => {
    const doc = parsePatternYaml("name: Chunking # note\ncount: 3\nflag: true\n");
    expect(doc).toEqual({ name: "Chunking", count: 3, flag: true });
  });

  it("rejects a block that mixes list items and map entries", () => {
    expect(() => parsePatternYaml("bad:\n  - item\n  key: value\n")).toThrow();
  });
});

describe("MarkdownKnowledgeBase", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "map-patterns-"));
    await mkdir(join(dir, "retrieval", "chunking"), { recursive: true });
    await writeFile(
      join(dir, "retrieval", "chunking", "pattern.yaml"),
      CHUNKING_YAML,
    );
    // A directory without pattern.yaml must be skipped, not crash the loader.
    await mkdir(join(dir, "retrieval", "empty"), { recursive: true });
    // Non-category directories (e.g. _template) must be ignored.
    await mkdir(join(dir, "_template"), { recursive: true });
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads patterns from pattern.yaml files", async () => {
    const kb = new MarkdownKnowledgeBase(dir, new FileSystemStorage());
    const all = await kb.all();
    expect(all).toHaveLength(1);

    const chunking = await kb.get("retrieval/chunking");
    expect(chunking?.name).toBe("Chunking");
    expect(chunking?.category).toBe("retrieval");
    expect(chunking?.productionReadiness).toBe("established");
    // Stars → coarse ratings: complexity 2 → low; latency/cost 5 stars → low impact.
    expect(chunking?.complexity).toBe("low");
    expect(chunking?.latencyImpact).toBe("low");
    expect(chunking?.costImpact).toBe("low");
    expect(chunking?.compatiblePatterns).toEqual(["retrieval/reranking"]);
  });

  it("finds by text and category", async () => {
    const kb = new MarkdownKnowledgeBase(dir, new FileSystemStorage());
    expect(await kb.find({ text: "chunk" })).toHaveLength(1);
    expect(await kb.find({ text: "chunk", category: "retrieval" })).toHaveLength(1);
    expect(await kb.find({ category: "memory" })).toHaveLength(0);
    expect(await kb.find({ text: "nothing-matches" })).toHaveLength(0);
  });

  it("exposes catalog metadata (MAP Score, maturity)", async () => {
    const kb = new MarkdownKnowledgeBase(dir, new FileSystemStorage());
    await kb.load();
    const entry = kb.entry("retrieval/chunking");
    expect(entry?.maturity).toBe("established");
    expect(entry?.score?.complexity).toBe(2);
  });

  it("returns an empty catalog for a missing directory", async () => {
    const kb = new MarkdownKnowledgeBase(join(dir, "nope"), new FileSystemStorage());
    expect(await kb.all()).toHaveLength(0);
  });
});

describe("map patterns", () => {
  let dir: string;
  let lines: string[];
  const reporter: Reporter = {
    info: (m) => lines.push(m),
    success: (m) => lines.push(m),
    warn: (m) => lines.push(m),
    error: (m) => lines.push(m),
  };

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "map-patterns-cmd-"));
    await mkdir(join(dir, "retrieval", "chunking"), { recursive: true });
    await writeFile(
      join(dir, "retrieval", "chunking", "pattern.yaml"),
      CHUNKING_YAML,
    );
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function services() {
    const storage = new FileSystemStorage();
    return createDefaultServices({
      storage,
      knowledgeBase: new MarkdownKnowledgeBase(dir, storage),
    });
  }

  it("lists the catalog with MAP Score stars", async () => {
    lines = [];
    const code = await runCli(["patterns"], { reporter, services: services() });
    expect(code).toBe(0);
    const out = lines.join("\n");
    expect(out).toContain("Chunking (retrieval/chunking) — established");
    expect(out).toContain("Complexity ★★☆☆☆");
    expect(out).toContain("1 pattern(s).");
  });

  it("searches by text and reports empty results", async () => {
    lines = [];
    expect(
      await runCli(["patterns", "chunk"], { reporter, services: services() }),
    ).toBe(0);
    expect(lines.join("\n")).toContain("Chunking");

    lines = [];
    expect(
      await runCli(["patterns", "nomatch"], { reporter, services: services() }),
    ).toBe(0);
    expect(lines.join("\n")).toContain("No patterns matched.");
  });

  it("emits machine-readable JSON with --json", async () => {
    lines = [];
    const code = await runCli(["patterns", "--json"], {
      reporter,
      services: services(),
    });
    expect(code).toBe(0);
    const parsed = JSON.parse(lines.join("\n"));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("retrieval/chunking");
    expect(parsed[0].score.latency).toBe(5);
  });

  it("rejects an unknown category", async () => {
    lines = [];
    const code = await runCli(["patterns", "--category=bogus"], {
      reporter,
      services: services(),
    });
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("Unknown category 'bogus'");
  });

  it("loads the real repo catalog by default", async () => {
    lines = [];
    const code = await runCli(["patterns", "--category=retrieval"], {
      reporter,
    });
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("retrieval/chunking");
  });
});
