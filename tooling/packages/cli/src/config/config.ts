/**
 * Configuration system.
 *
 * One artifact lives at the root of `.map/`: `map.config.json` — the project's
 * MAP workspace configuration (schema version 3; version 1 was the yaml pair
 * `config.yaml` + `project.yaml`, migrated by `map init`). The file is generated
 * from a template by `map init` and is meant to be edited by the user.
 *
 * Schema version 3 adds `sources`/`targets`: the inputs and outputs of the
 * context compiler (`map sync`). Both are optional — a v2 config still parses,
 * and the compiler falls back to `DEFAULT_SOURCES`/`DEFAULT_TARGETS`.
 */

/** Schema version for the on-disk workspace, bumped on breaking changes. */
export const CONFIG_SCHEMA_VERSION = 3;

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
  /** MAP Standard version. Optional in legacy v2/v3 workspaces. */
  readonly specVersion?: string;
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
  /** Declarative pack requirements; resolution is introduced separately. */
  readonly packs?: readonly PackReference[];
  /** Project-level tools configured for this MAP workspace. */
  readonly tools?: {
    readonly tokenOptimizer?: TokenOptimizerConfig;
  };
  /**
   * Context-compiler inputs: globs (relative to `.map/`) of the markdown that
   * `map sync` compiles into the AI context files. Absent → `DEFAULT_SOURCES`.
   */
  readonly sources?: readonly string[];
  /**
   * Context-compiler outputs, keyed by target id (claude, agents, gemini,
   * cursor, copilot, …). Absent → `DEFAULT_TARGETS`.
   */
  readonly targets?: Readonly<Record<string, CompilerTarget>>;
}

export interface PackReference {
  /** Namespaced pack id, for example `@map/reviewer`. */
  readonly name: string;
  /** Optional semver version or range. */
  readonly version?: string;
}

export interface TokenOptimizerConfig {
  /** Approximate maximum context size for the project. */
  readonly budget?: number;
  /** Markdown globs relative to `.map/`. */
  readonly include?: readonly string[];
  /** Markdown globs to exclude from the report. */
  readonly exclude?: readonly string[];
}

export interface CompilerTarget {
  /** Path of the generated file, relative to the project root. */
  readonly output: string;
  /** Adapter to compile with; defaults to the target's key. */
  readonly adapter?: string;
}

/** Default compiler sources: every markdown document in the workspace. */
export const DEFAULT_SOURCES: readonly string[] = ["**/*.md"];

/** Default compiler targets: one context file per supported assistant. */
export const DEFAULT_TARGETS: Readonly<Record<string, CompilerTarget>> = {
  claude: { output: "CLAUDE.md" },
  agents: { output: "AGENTS.md" },
  gemini: { output: "GEMINI.md" },
  cursor: { output: ".cursor/rules/map.mdc" },
  copilot: { output: ".github/copilot-instructions.md" },
};

/** Parse and structurally validate a map.config.json document. */
export function parseConfig(json: string): MapConfig {
  const data: unknown = JSON.parse(json);
  if (!isRecord(data)) {
    throw new Error(`${CONFIG_FILE} must be a JSON object`);
  }
  if (typeof data.version !== "number" || !Number.isInteger(data.version)) {
    throw new Error(`${CONFIG_FILE} has no numeric 'version'`);
  }
  if (data.version > CONFIG_SCHEMA_VERSION) {
    throw new Error(
      `${CONFIG_FILE} version ${data.version} is newer than this CLI supports ` +
        `(${CONFIG_SCHEMA_VERSION}); update the CLI`,
    );
  }
  if (data.version < 2) {
    throw new Error(`${CONFIG_FILE}.version must be at least 2; run 'map init --yes' to migrate`);
  }

  assertKeys(data, ["version", "specVersion", "project", "analysis", "registry", "packs", "tools", "sources", "targets"], "$", true);
  if (data.specVersion !== undefined) {
    assertString(data.specVersion, "$.specVersion", /^\d+\.\d+$/);
  }

  const project = assertObject(data.project, "$.project");
  assertKeys(project, ["name", "createdAt", "languages"], "$.project", true);
  assertString(project.name, "$.project.name", /\S/);
  const createdAt = assertString(project.createdAt, "$.project.createdAt");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(createdAt)) {
    fail("$.project.createdAt", "must be an RFC 3339 UTC timestamp");
  }
  assertStringArray(project.languages, "$.project.languages", true);

  const analysis = assertObject(data.analysis, "$.analysis");
  assertKeys(analysis, ["analyzers", "include", "exclude"], "$.analysis", true);
  assertStringArray(analysis.analyzers, "$.analysis.analyzers", true);
  for (const key of ["include", "exclude"] as const) {
    const values = assertStringArray(analysis[key], `$.analysis.${key}`, true);
    values.forEach((value, index) => assertRelativePath(value, `$.analysis.${key}[${index}]`));
  }

  const registry = assertObject(data.registry, "$.registry");
  assertKeys(registry, ["source"], "$.registry", true);
  assertString(registry.source, "$.registry.source", /\S/);

  if (data.packs !== undefined) validatePacks(data.packs);
  if (data.tools !== undefined) validateTools(data.tools);
  if (data.sources !== undefined) {
    const sources = assertStringArray(data.sources, "$.sources", false);
    sources.forEach((source, index) => assertRelativePath(source, `$.sources[${index}]`));
  }
  if (data.targets !== undefined) validateTargets(data.targets);

  return data as unknown as MapConfig;
}

function validatePacks(value: unknown): void {
  if (!Array.isArray(value)) fail("$.packs", "must be an array");
  const names = new Set<string>();
  value.forEach((entry, index) => {
    const path = `$.packs[${index}]`;
    const pack = assertObject(entry, path);
    assertKeys(pack, ["name", "version"], path, true);
    const name = assertString(pack.name, `${path}.name`, /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/);
    if (names.has(name)) fail(`${path}.name`, "must be unique");
    names.add(name);
    if (pack.version !== undefined) assertString(pack.version, `${path}.version`, /\S/);
  });
}

function validateTools(value: unknown): void {
  const tools = assertObject(value, "$.tools");
  assertKeys(tools, ["tokenOptimizer"], "$.tools", true);
  if (tools.tokenOptimizer === undefined) return;
  const optimizer = assertObject(tools.tokenOptimizer, "$.tools.tokenOptimizer");
  assertKeys(optimizer, ["budget", "include", "exclude"], "$.tools.tokenOptimizer", true);
  if (optimizer.budget !== undefined &&
      (typeof optimizer.budget !== "number" || !Number.isInteger(optimizer.budget) || optimizer.budget < 1)) {
    fail("$.tools.tokenOptimizer.budget", "must be a positive integer");
  }
  for (const key of ["include", "exclude"] as const) {
    if (optimizer[key] === undefined) continue;
    const values = assertStringArray(optimizer[key], `$.tools.tokenOptimizer.${key}`, true);
    values.forEach((item, index) => assertRelativePath(item, `$.tools.tokenOptimizer.${key}[${index}]`));
  }
}

function validateTargets(value: unknown): void {
  const targets = assertObject(value, "$.targets");
  if (Object.keys(targets).length === 0) fail("$.targets", "must define at least one target");
  for (const [id, rawTarget] of Object.entries(targets)) {
    if (!/^[a-z][a-z0-9-]*$/.test(id)) fail(`$.targets.${id}`, "has an invalid target id");
    const path = `$.targets.${id}`;
    const target = assertObject(rawTarget, path);
    assertKeys(target, ["output", "adapter"], path, true);
    assertRelativePath(assertString(target.output, `${path}.output`, /\S/), `${path}.output`);
    if (target.adapter !== undefined) {
      assertString(target.adapter, `${path}.adapter`, /^[a-z][a-z0-9-]*$/);
    }
  }
}

function assertObject(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(path, "must be an object");
  return value;
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  allowExtensions: boolean,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key) && !(allowExtensions && key.startsWith("x-"))) {
      fail(`${path}.${key}`, "is not a recognized field; use an 'x-' prefix for extensions");
    }
  }
}

function assertString(value: unknown, path: string, pattern?: RegExp): string {
  if (typeof value !== "string" || value.length === 0) fail(path, "must be a non-empty string");
  if (pattern !== undefined && !pattern.test(value)) fail(path, "has an invalid format");
  return value;
}

function assertStringArray(value: unknown, path: string, allowEmpty: boolean): readonly string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(path, allowEmpty ? "must be an array" : "must be a non-empty array");
  }
  const seen = new Set<string>();
  value.forEach((item, index) => {
    const text = assertString(item, `${path}[${index}]`);
    if (seen.has(text)) fail(`${path}[${index}]`, "must be unique");
    seen.add(text);
  });
  return value as string[];
}

function assertRelativePath(value: string, path: string): void {
  if (/^(?:\/|[A-Za-z]:[\\/])/.test(value) || /(?:^|[\\/])\.\.(?:[\\/]|$)/.test(value)) {
    fail(path, "must be a project-relative path or glob without '..' traversal");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(path: string, reason: string): never {
  throw new Error(`${CONFIG_FILE}: ${path} ${reason}`);
}
