/**
 * Composition root.
 *
 * `Services` is the bundle of wired core modules that commands depend on. Building it
 * in one place keeps the layers decoupled: commands ask for capabilities through
 * interfaces and never construct concrete implementations themselves. This is the
 * "dependency injection where appropriate" the project aims for, kept as a simple
 * factory rather than a framework.
 */

import type { Storage } from "./storage/index.ts";
import { FileSystemStorage } from "./storage/index.ts";
import type { KnowledgeBase, PatternCatalog } from "./knowledge/index.ts";
import {
  InMemoryKnowledgeBase,
  RegistryPatternCatalog,
  loadRegistry,
  resolveRegistrySource,
} from "./knowledge/index.ts";
import type { PatternGraph } from "./graph/index.ts";
import { InMemoryPatternGraph } from "./graph/index.ts";
import { AnalyzerRegistry, DependencyManifestAnalyzer } from "./analyzer/index.ts";
import type { Recommender } from "./recommendation/index.ts";
import { RuleBasedRecommender } from "./recommendation/index.ts";

export interface Services {
  readonly storage: Storage;
  readonly knowledgeBase: KnowledgeBase;
  readonly catalog: PatternCatalog;
  readonly graph: PatternGraph;
  readonly analyzers: AnalyzerRegistry;
  readonly recommender: Recommender;
}

/** Allow callers (and tests) to override any single dependency. */
export type ServiceOverrides = Partial<Services>;

export function createDefaultServices(overrides: ServiceOverrides = {}): Services {
  const storage = overrides.storage ?? new FileSystemStorage();
  return {
    storage,
    knowledgeBase: overrides.knowledgeBase ?? new InMemoryKnowledgeBase(),
    catalog: overrides.catalog ?? defaultCatalog(storage),
    graph: overrides.graph ?? new InMemoryPatternGraph(),
    analyzers: overrides.analyzers ?? defaultAnalyzers(storage),
    recommender: overrides.recommender ?? new RuleBasedRecommender(),
  };
}

/**
 * The default catalog reads the MAP registry: an explicit `MAP_REGISTRY` file,
 * the user cache written by `map update`, or the snapshot bundled with the
 * package (see knowledge/registry-source.ts).
 */
function defaultCatalog(storage: Storage): PatternCatalog {
  return new RegistryPatternCatalog(async () =>
    loadRegistry(storage, await resolveRegistrySource(storage)),
  );
}

function defaultAnalyzers(storage: Storage): AnalyzerRegistry {
  const registry = new AnalyzerRegistry();
  registry.register(new DependencyManifestAnalyzer(storage));
  return registry;
}
