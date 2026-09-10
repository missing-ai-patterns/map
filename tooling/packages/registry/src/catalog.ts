/**
 * The registry payload types — the wire shape of a pattern entry.
 *
 * These are the canonical definitions shared by every MAP tool: the CLI, the
 * website, and the registry builder in the `map` repository. A `CatalogEntry` is
 * deliberately light: the registry tracks patterns that are only roadmap items
 * (most fields unknown) as well as fully written ones.
 */

import type { MapScore } from "@missing-ai-patterns/score";

export type { MapScore };

/** Stable identifier for a pattern, e.g. "retrieval/reranking". */
export type PatternId = string;

/** The ten MAP categories. Mirrors the `patterns/` directory in the map repo. */
export type PatternCategory =
  | "retrieval"
  | "memory"
  | "agents"
  | "security"
  | "context"
  | "evaluation"
  | "performance"
  | "routing"
  | "tool-calling"
  | "observability";

/** Mirrors the roadmap legend: ⬜ Planned · 🟡 In progress · ✅ Published. */
export type CatalogStatus = "published" | "in-progress" | "planned";

export interface CatalogEntry {
  readonly id: PatternId;
  readonly name: string;
  readonly category: PatternCategory;
  readonly status: CatalogStatus;
  /** One-line summary; present when the pattern is written. */
  readonly summary?: string;
  /** Maturity (e.g. "established"); present when written. */
  readonly maturity?: string;
  /** Alternative names for the pattern. */
  readonly alsoKnownAs?: readonly string[];
  /** MAP Score; present when written and complete. */
  readonly score?: MapScore;
  /** Decision guidance from the pattern contract; present when written. */
  readonly whenToUse?: readonly string[];
  readonly whenNotToUse?: readonly string[];
  /** Related pattern ids; present when written. */
  readonly related?: readonly PatternId[];
  /** External references (papers, articles). */
  readonly references?: readonly string[];
  /**
   * Pattern files embedded by the registry (`prompt.md`, `acceptance.md`),
   * so `map add` can scaffold them without network access.
   */
  readonly files?: Readonly<Record<string, string>>;
}
