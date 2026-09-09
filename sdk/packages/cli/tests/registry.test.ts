import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  parseRegistry,
  RegistryPatternCatalog,
  resolveRegistrySource,
  loadRegistry,
  loadRegistryResilient,
  registryUpdateUrl,
  defaultRegistryUrl,
  DEFAULT_REGISTRY_URL,
} from "../src/knowledge/index.ts";
import { RECOMMENDATION_RULES } from "../src/recommendation/index.ts";
import { FileSystemStorage } from "../src/storage/index.ts";
import { fakeStorage, registryJson } from "./helpers.ts";

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
  });

  it("rejects invalid JSON, missing fields, and future schema versions", () => {
    expect(() => parseRegistry("{nope")).toThrow(/not valid JSON/);
    expect(() => parseRegistry("[]")).toThrow(/JSON object/);
    expect(() => parseRegistry("{}")).toThrow(/schemaVersion/);
    expect(() => parseRegistry('{"schemaVersion": 99, "source": {"repository": "r", "version": "1"}, "patterns": []}')).toThrow(/newer than/);
    expect(() => parseRegistry('{"schemaVersion": 1, "patterns": []}')).toThrow(/source/);
    expect(() =>
      parseRegistry('{"schemaVersion": 1, "source": {"repository": "r", "version": "1"}, "patterns": [{"id": "x"}]}'),
    ).toThrow(/without id\/name\/category\/status/);
  });
});

describe("RegistryPatternCatalog", () => {
  const catalog = () =>
    new RegistryPatternCatalog(async () => parseRegistry(registryJson(PATTERNS)));

  it("serves entries and lookups from the registry", async () => {
    const chunking = await catalog().get("retrieval/chunking");
    expect(chunking?.status).toBe("published");
    expect(chunking?.files?.["prompt.md"]).toBe("# Prompt");
    expect(await catalog().get("nope")).toBeUndefined();
  });

  it("filters by category, status, and text", async () => {
    const c = catalog();
    expect((await c.find({ category: "retrieval" })).length).toBe(2);
    expect((await c.find({ status: "planned" })).length).toBe(2);
    expect((await c.find({ text: "cache" })).map((e) => e.id)).toEqual([
      "retrieval/semantic-cache",
    ]);
  });

  it("loads the document once and caches it", async () => {
    let loads = 0;
    const c = new RegistryPatternCatalog(async () => {
      loads += 1;
      return parseRegistry(registryJson(PATTERNS));
    });
    await c.entries();
    await c.entries();
    expect(loads).toBe(1);
  });
});

describe("registry source resolution", () => {
  it("prefers a MAP_REGISTRY file override", async () => {
    const storage = fakeStorage({ "/custom/registry.json": registryJson(PATTERNS) });
    const source = await resolveRegistrySource(storage, {
      env: { MAP_REGISTRY: "/custom/registry.json" },
      cachePath: "/home/.map/registry.json",
      bundledPath: "/pkg/registry.json",
    });
    expect(source).toEqual({ kind: "override", path: "/custom/registry.json" });
  });

  it("falls back to the user cache, then the bundled snapshot", async () => {
    const withCache = fakeStorage({ "/home/.map/registry.json": "{}" });
    expect(
      await resolveRegistrySource(withCache, {
        env: {},
        cachePath: "/home/.map/registry.json",
        bundledPath: "/pkg/registry.json",
      }),
    ).toEqual({ kind: "cache", path: "/home/.map/registry.json" });

    const empty = fakeStorage();
    expect(
      await resolveRegistrySource(empty, {
        env: { MAP_REGISTRY: "https://example.com/registry.json" },
        cachePath: "/home/.map/registry.json",
        bundledPath: "/pkg/registry.json",
      }),
    ).toEqual({ kind: "bundled", path: "/pkg/registry.json" });
  });

  it("uses MAP_REGISTRY as the update URL only when it is a URL", () => {
    expect(registryUpdateUrl({ MAP_REGISTRY: "https://example.com/r.json" })).toBe(
      "https://example.com/r.json",
    );
    expect(registryUpdateUrl({ MAP_REGISTRY: "/a/file.json" })).toBe(DEFAULT_REGISTRY_URL);
    expect(registryUpdateUrl({})).toBe(DEFAULT_REGISTRY_URL);
  });

  it("lets MAP_REGISTRY_URL override the published download URL (repo-rename safe)", () => {
    const url = "https://github.com/missing-ai-patterns/patterns/releases/latest/download/registry.json";
    expect(defaultRegistryUrl({ MAP_REGISTRY_URL: url })).toBe(url);
    expect(defaultRegistryUrl({})).toBe(DEFAULT_REGISTRY_URL);
    // MAP_REGISTRY_URL sets the default that a bare `map update` uses.
    expect(registryUpdateUrl({ MAP_REGISTRY_URL: url })).toBe(url);
  });

  it("loadRegistry wraps unreadable and invalid registries in actionable errors", async () => {
    const storage = fakeStorage({ "/bad.json": "{broken" });
    await expect(
      loadRegistry(storage, { kind: "cache", path: "/missing.json" }),
    ).rejects.toThrow(/could not read the pattern registry/);
    await expect(
      loadRegistry(storage, { kind: "cache", path: "/bad.json" }),
    ).rejects.toThrow(/invalid pattern registry/);
  });
});

describe("loadRegistryResilient", () => {
  const options = {
    env: {},
    cachePath: "/home/.map/registry.json",
    bundledPath: "/pkg/registry.json",
  };

  it("returns the cache when it is healthy", async () => {
    const storage = fakeStorage({
      "/home/.map/registry.json": registryJson(PATTERNS),
      "/pkg/registry.json": registryJson([]),
    });
    const loaded = await loadRegistryResilient(storage, options);
    expect(loaded.source.kind).toBe("cache");
    expect(loaded.degradedFrom).toBeUndefined();
    expect(loaded.document.patterns).toHaveLength(3);
  });

  it("degrades a broken cache to the bundled snapshot", async () => {
    const storage = fakeStorage({
      "/home/.map/registry.json": "{truncated",
      "/pkg/registry.json": registryJson(PATTERNS),
    });
    const loaded = await loadRegistryResilient(storage, options);
    expect(loaded.source).toEqual({ kind: "bundled", path: "/pkg/registry.json" });
    expect(loaded.degradedFrom).toEqual({ kind: "cache", path: "/home/.map/registry.json" });
    expect(loaded.document.patterns).toHaveLength(3);
  });

  it("stays loud when an explicit MAP_REGISTRY override is broken", async () => {
    const storage = fakeStorage({
      "/custom/registry.json": "{broken",
      "/pkg/registry.json": registryJson(PATTERNS),
    });
    await expect(
      loadRegistryResilient(storage, {
        ...options,
        env: { MAP_REGISTRY: "/custom/registry.json" },
      }),
    ).rejects.toThrow(/invalid pattern registry/);
  });
});

describe("catalog integrity (bundled snapshot)", () => {
  it("every pattern id in the rule table resolves in the bundled registry", async () => {
    const snapshot = join(import.meta.dirname, "..", "registry-snapshot", "registry.json");
    const registry = parseRegistry(await new FileSystemStorage().readFile(snapshot));
    const known = new Set(registry.patterns.map((e) => e.id));
    expect(known.size).toBeGreaterThan(50);

    for (const rule of RECOMMENDATION_RULES) {
      for (const recommendation of rule.recommend) {
        expect(known, `rule '${rule.id}' references '${recommendation.pattern}'`).toContain(
          recommendation.pattern,
        );
      }
    }
  });
});
