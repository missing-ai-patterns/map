/**
 * The MAP registry document: the machine-readable catalog published by the
 * canonical `map` repository (see docs/specs/registry.md there). Tools consume
 * this artifact — a bundled snapshot, a user cache, or an explicit override —
 * and never parse the repository's Markdown directly.
 *
 * This is the single definition of the registry contract; the CLI, the website,
 * and the registry builder all depend on it so the schema can never drift.
 */

import type { CatalogEntry } from "./catalog.ts";

/** The registry schema version this package understands. */
export const SUPPORTED_SCHEMA_VERSION = 1;

export interface RegistryDocument {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  readonly source: {
    readonly repository: string;
    readonly version: string;
  };
  readonly categories: readonly string[];
  readonly patterns: readonly CatalogEntry[];
}

/**
 * Parses and validates a registry JSON string. Throws with a human-readable
 * message on any structural problem — a corrupt registry should be loud, since
 * every catalog-backed tool depends on it.
 */
export function parseRegistry(json: string): RegistryDocument {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("registry is not valid JSON");
  }
  if (!isRecord(data)) throw new Error("registry must be a JSON object");

  const schemaVersion = data["schemaVersion"];
  if (typeof schemaVersion !== "number") {
    throw new Error("registry has no schemaVersion");
  }
  if (schemaVersion > SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `registry schemaVersion ${schemaVersion} is newer than this tool supports ` +
        `(${SUPPORTED_SCHEMA_VERSION}); update the tool`,
    );
  }

  const source = data["source"];
  if (!isRecord(source) || typeof source["repository"] !== "string" || typeof source["version"] !== "string") {
    throw new Error("registry has no source.repository/source.version");
  }

  const patterns = data["patterns"];
  if (!Array.isArray(patterns)) throw new Error("registry has no patterns array");
  for (const entry of patterns) {
    if (
      !isRecord(entry) ||
      typeof entry["id"] !== "string" ||
      typeof entry["name"] !== "string" ||
      typeof entry["category"] !== "string" ||
      typeof entry["status"] !== "string"
    ) {
      throw new Error("registry contains a pattern without id/name/category/status");
    }
  }

  const categories = Array.isArray(data["categories"])
    ? (data["categories"] as string[])
    : [...new Set((patterns as Array<{ category: string }>).map((p) => p.category))];

  return {
    schemaVersion,
    generatedAt: typeof data["generatedAt"] === "string" ? data["generatedAt"] : "",
    source: { repository: source["repository"], version: source["version"] },
    categories,
    patterns: patterns as CatalogEntry[],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
