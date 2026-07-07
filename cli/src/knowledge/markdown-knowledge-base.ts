/**
 * KnowledgeBase backed by the repository's pattern catalog: every
 * `patterns/<category>/<slug>/pattern.yaml` becomes a `Pattern`.
 *
 * This is the first real loader for Module 1. It reads only the machine-readable
 * contract (`pattern.yaml`); narrative sections that exist only in README.md
 * (problem, solution, trade-offs) stay empty until the contract carries them.
 */

import { join } from "node:path";
import type {
  Pattern,
  PatternId,
  PatternCategory,
  Rating,
  ProductionReadiness,
  ImplementationReference,
} from "../domain/index.ts";
import type { Storage } from "../storage/index.ts";
import type { KnowledgeBase, PatternQuery } from "./knowledge-base.ts";
import { InMemoryKnowledgeBase } from "./in-memory-knowledge-base.ts";
import { parsePatternYaml, type PatternYamlDoc } from "./pattern-yaml.ts";

const CATEGORIES: readonly PatternCategory[] = [
  "retrieval",
  "memory",
  "agents",
  "security",
  "context",
  "evaluation",
  "performance",
  "routing",
  "tool-calling",
  "observability",
];

/** The five MAP Score dimensions, 1..5 stars each (see map-score/SPEC.md). */
export interface MapScore {
  readonly complexity: number;
  readonly latency: number;
  readonly cost: number;
  readonly accuracyImpact: number;
  readonly productionReadiness: number;
}

/** A loaded pattern plus catalog-only metadata the domain model doesn't carry yet. */
export interface CatalogEntry {
  readonly pattern: Pattern;
  readonly score?: MapScore;
  readonly maturity?: string;
}

export class MarkdownKnowledgeBase implements KnowledgeBase {
  private readonly entries = new Map<PatternId, CatalogEntry>();
  private delegate = new InMemoryKnowledgeBase();
  private loaded = false;

  private readonly patternsDir: string;
  private readonly storage: Storage;

  constructor(patternsDir: string, storage: Storage) {
    this.patternsDir = patternsDir;
    this.storage = storage;
  }

  async load(): Promise<void> {
    this.entries.clear();
    const patterns: Pattern[] = [];

    for (const category of await this.storage.listDirs(this.patternsDir)) {
      if (!CATEGORIES.includes(category as PatternCategory)) continue;
      const categoryDir = join(this.patternsDir, category);

      for (const slug of await this.storage.listDirs(categoryDir)) {
        const file = join(categoryDir, slug, "pattern.yaml");
        if (!(await this.storage.exists(file))) continue;

        const doc = parsePatternYaml(await this.storage.readFile(file));
        const entry = toEntry(doc, category as PatternCategory, slug);
        this.entries.set(entry.pattern.id, entry);
        patterns.push(entry.pattern);
      }
    }

    this.delegate = new InMemoryKnowledgeBase(patterns);
    this.loaded = true;
  }

  async all(): Promise<readonly Pattern[]> {
    await this.ensureLoaded();
    return this.delegate.all();
  }

  async get(id: PatternId): Promise<Pattern | undefined> {
    await this.ensureLoaded();
    return this.delegate.get(id);
  }

  async find(query: PatternQuery): Promise<readonly Pattern[]> {
    await this.ensureLoaded();
    return this.delegate.find(query);
  }

  /** Catalog metadata (MAP Score, maturity) for a loaded pattern. */
  entry(id: PatternId): CatalogEntry | undefined {
    return this.entries.get(id);
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.load();
  }
}

function toEntry(
  doc: PatternYamlDoc,
  category: PatternCategory,
  slug: string,
): CatalogEntry {
  const score = toScore(doc["score"]);
  const maturity = asString(doc["maturity"]);

  const pattern: Pattern = {
    id: asString(doc["id"]) ?? `${category}/${slug}`,
    name: asString(doc["name"]) ?? slug,
    category,
    description: asString(doc["summary"]) ?? "",
    problem: "",
    solution: "",
    tradeoffs: [],
    prerequisites: [],
    alternatives: [],
    compatiblePatterns: asStringList(doc["related"]),
    conflictingPatterns: [],
    implementationReferences: toImplementationReferences(doc),
    complexity: ratingFromStars(score?.complexity ?? 3, "direct"),
    latencyImpact: ratingFromStars(score?.latency ?? 3, "inverted"),
    costImpact: ratingFromStars(score?.cost ?? 3, "inverted"),
    securityConsiderations: [],
    productionReadiness: toReadiness(maturity, score),
  };

  return { pattern, ...(score ? { score } : {}), ...(maturity ? { maturity } : {}) };
}

function toScore(value: unknown): MapScore | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const map = value as Record<string, unknown>;
  const dims = ["complexity", "latency", "cost", "accuracyImpact", "productionReadiness"] as const;
  const out: Record<string, number> = {};
  for (const dim of dims) {
    const n = map[dim];
    if (typeof n !== "number" || n < 1 || n > 5) return undefined;
    out[dim] = n;
  }
  return out as unknown as MapScore;
}

/**
 * Collapse a 1..5 star dimension into the coarse `Rating`. For "inverted"
 * dimensions (latency, cost) more stars means *less* impact (see map-score/SPEC.md),
 * so the mapping flips.
 */
function ratingFromStars(stars: number, direction: "direct" | "inverted"): Rating {
  const value = direction === "inverted" ? 6 - stars : stars;
  if (value <= 2) return "low";
  if (value === 3) return "medium";
  return "high";
}

function toReadiness(
  maturity: string | undefined,
  score: MapScore | undefined,
): ProductionReadiness {
  if (maturity === "experimental" || maturity === "emerging" || maturity === "established") {
    return maturity;
  }
  const stars = score?.productionReadiness ?? 3;
  if (stars <= 2) return "experimental";
  if (stars === 3) return "emerging";
  return "established";
}

function toImplementationReferences(doc: PatternYamlDoc): readonly ImplementationReference[] {
  return asStringList(doc["reference_implementations"]).map((location) => ({
    label: "Reference implementation",
    location,
  }));
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function asStringList(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}
