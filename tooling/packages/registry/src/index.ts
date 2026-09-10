/**
 * `@missing-ai-patterns/registry` — the MAP registry contract.
 *
 * The single, shared definition of the machine-readable pattern catalog: its
 * TypeScript types and a validating parser. Every MAP tool (the CLI, the website,
 * the registry builder) depends on this package so the schema can never drift.
 */

export type {
  CatalogEntry,
  CatalogStatus,
  PatternId,
  PatternCategory,
  MapScore,
} from "./catalog.ts";

export { SUPPORTED_SCHEMA_VERSION, parseRegistry } from "./registry.ts";
export type { RegistryDocument } from "./registry.ts";
