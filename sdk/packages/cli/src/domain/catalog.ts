/**
 * The pattern catalog entry type.
 *
 * `CatalogEntry` is the wire shape of a pattern in the MAP registry — defined once
 * in the shared `@missing-ai-patterns/registry` package and re-exported here so the
 * domain layer stays the CLI's single import surface. It is deliberately lighter
 * than `Pattern` (see pattern.ts): the catalog also tracks patterns that only exist
 * as roadmap items, for which most fields are unknown.
 */

export type {
  CatalogEntry,
  CatalogStatus,
  MapScore,
} from "@missing-ai-patterns/registry";
