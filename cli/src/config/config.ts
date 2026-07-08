/**
 * Configuration system.
 *
 * One artifact lives at the root of `.map/`: `map.config.json` — the project's
 * MAP workspace configuration (schema version 2; version 1 was the yaml pair
 * `config.yaml` + `project.yaml`, migrated by `map init`). The file is generated
 * from a template by `map init` and is meant to be edited by the user.
 */

/** Schema version for the on-disk workspace, bumped on breaking changes. */
export const CONFIG_SCHEMA_VERSION = 2;

/** The directory MAP creates in a project. */
export const MAP_DIR = ".map";

/** The workspace configuration file inside `.map/`. */
export const CONFIG_FILE = "map.config.json";

/** Workspace files from schema version 1, detected for migration. */
export const LEGACY_WORKSPACE_FILES = [
  "config.yaml",
  "project.yaml",
  "knowledge/patterns.json",
] as const;

export interface MapConfig {
  readonly version: number;
  readonly project: {
    readonly name: string;
    readonly createdAt: string;
    /** Detected languages, e.g. ["typescript", "python"]. */
    readonly languages: readonly string[];
  };
  readonly analysis: {
    /** Analyzer ids to run; empty means "all applicable". */
    readonly analyzers: readonly string[];
    readonly include: readonly string[];
    readonly exclude: readonly string[];
  };
  readonly registry: {
    /** "default" or an explicit registry URL/path. */
    readonly source: string;
  };
}

/** Parse and structurally validate a map.config.json document. */
export function parseConfig(json: string): MapConfig {
  const data: unknown = JSON.parse(json);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`${CONFIG_FILE} must be a JSON object`);
  }
  const config = data as MapConfig;
  if (typeof config.version !== "number") {
    throw new Error(`${CONFIG_FILE} has no numeric 'version'`);
  }
  if (config.version > CONFIG_SCHEMA_VERSION) {
    throw new Error(
      `${CONFIG_FILE} version ${config.version} is newer than this CLI supports ` +
        `(${CONFIG_SCHEMA_VERSION}); update the CLI`,
    );
  }
  return config;
}
