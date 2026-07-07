/**
 * Composition root.
 *
 * `Services` is the bundle of wired core modules that commands depend on. Building it
 * in one place keeps the layers decoupled: commands ask for capabilities through
 * interfaces and never construct concrete implementations themselves. This is the
 * "dependency injection where appropriate" the project aims for, kept as a simple
 * factory rather than a framework.
 */

import { fileURLToPath } from "node:url";
import type { Storage } from "./storage/index.ts";
import { FileSystemStorage } from "./storage/index.ts";
import type { KnowledgeBase } from "./knowledge/index.ts";
import { MarkdownKnowledgeBase } from "./knowledge/index.ts";
import type { PatternGraph } from "./graph/index.ts";
import { InMemoryPatternGraph } from "./graph/index.ts";
import { AnalyzerRegistry } from "./analyzer/index.ts";
import type { Recommender } from "./recommendation/index.ts";
import { NullRecommender } from "./recommendation/index.ts";

export interface Services {
  readonly storage: Storage;
  readonly knowledgeBase: KnowledgeBase;
  readonly graph: PatternGraph;
  readonly analyzers: AnalyzerRegistry;
  readonly recommender: Recommender;
}

/** Allow callers (and tests) to override any single dependency. */
export type ServiceOverrides = Partial<Services>;

/**
 * Where the pattern catalog lives. Defaults to the repo's `patterns/` directory
 * (the CLI runs from source in the monorepo); `MAP_PATTERNS_DIR` overrides it,
 * which is also how a future packaged install will point at a bundled catalog.
 */
export function defaultPatternsDir(): string {
  return (
    process.env["MAP_PATTERNS_DIR"] ??
    fileURLToPath(new URL("../../patterns", import.meta.url))
  );
}

export function createDefaultServices(overrides: ServiceOverrides = {}): Services {
  const storage = overrides.storage ?? new FileSystemStorage();
  return {
    storage,
    knowledgeBase:
      overrides.knowledgeBase ??
      new MarkdownKnowledgeBase(defaultPatternsDir(), storage),
    graph: overrides.graph ?? new InMemoryPatternGraph(),
    analyzers: overrides.analyzers ?? new AnalyzerRegistry(),
    recommender: overrides.recommender ?? new NullRecommender(),
  };
}
