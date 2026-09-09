/**
 * The registry document contract, re-exported from the shared
 * `@missing-ai-patterns/registry` package.
 *
 * The CLI keeps importing `parseRegistry` / `RegistryDocument` from the knowledge
 * layer; the definitions now live in the shared package so the schema is owned in
 * exactly one place (see docs/specs/registry.md in the map repo).
 */

export {
  SUPPORTED_SCHEMA_VERSION,
  parseRegistry,
} from "@missing-ai-patterns/registry";
export type { RegistryDocument } from "@missing-ai-patterns/registry";
