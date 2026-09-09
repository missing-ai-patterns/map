/**
 * Decides which registry document the CLI reads, and loads it.
 *
 * Resolution order:
 *   1. `MAP_REGISTRY` pointing at a local file — an explicit override, and how
 *      you develop against a map checkout (`MAP_REGISTRY=…/map/dist/registry.json`).
 *   2. The user cache (`~/.map/registry.json`), written by `map update`.
 *   3. The snapshot bundled with the package at build time (offline fallback).
 *
 * `MAP_REGISTRY` may also be a URL; then it replaces the default download URL
 * used by `map update`, while loading falls through to cache/bundled.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import type { Storage } from "../storage/index.ts";
import { bundledRegistryPath } from "../assets.ts";
import type { RegistryDocument } from "./registry.ts";
import { parseRegistry } from "./registry.ts";

/**
 * Where a fresh registry is downloaded from. The published location is a constant,
 * but it is overridable via the `MAP_REGISTRY_URL` environment variable so the
 * content repository can be renamed (or a mirror used) without a code change —
 * only this one place needs to know the URL.
 *
 * (This is distinct from `MAP_REGISTRY`, the per-invocation user override that may
 * point at a local file or a URL.)
 */
const FALLBACK_REGISTRY_URL =
  "https://github.com/missing-ai-patterns/patterns/releases/latest/download/registry.json";

/** Resolve the published registry URL, honouring the `MAP_REGISTRY_URL` override. */
export function defaultRegistryUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const override = env["MAP_REGISTRY_URL"];
  return override !== undefined && override !== "" ? override : FALLBACK_REGISTRY_URL;
}

export const DEFAULT_REGISTRY_URL = defaultRegistryUrl();

export type RegistrySourceKind = "override" | "cache" | "bundled";

export interface RegistrySource {
  readonly kind: RegistrySourceKind;
  readonly path: string;
}

export interface RegistrySourceOptions {
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** Overridable in tests; defaults to the package's bundled snapshot. */
  readonly bundledPath?: string;
  /** Overridable in tests; defaults to ~/.map/registry.json. */
  readonly cachePath?: string;
}

export function userRegistryCachePath(): string {
  return join(homedir(), ".map", "registry.json");
}

/** The URL `map update` downloads from (MAP_REGISTRY wins when it is a URL). */
export function registryUpdateUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const override = env["MAP_REGISTRY"];
  return override !== undefined && isUrl(override) ? override : defaultRegistryUrl(env);
}

export async function resolveRegistrySource(
  storage: Storage,
  options: RegistrySourceOptions = {},
): Promise<RegistrySource> {
  const env = options.env ?? process.env;
  const override = env["MAP_REGISTRY"];
  if (override !== undefined && override !== "" && !isUrl(override)) {
    return { kind: "override", path: override };
  }

  const cachePath = options.cachePath ?? userRegistryCachePath();
  if (await storage.exists(cachePath)) {
    return { kind: "cache", path: cachePath };
  }

  return { kind: "bundled", path: options.bundledPath ?? bundledRegistryPath() };
}

export interface LoadedRegistry {
  readonly document: RegistryDocument;
  readonly source: RegistrySource;
  /** Set when the resolved source was unusable and the bundled snapshot took over. */
  readonly degradedFrom?: RegistrySource;
}

/**
 * Load the registry from the resolved source, falling back to the bundled
 * snapshot when the user cache is unreadable or invalid. A broken cache must
 * degrade one source, not disable the whole CLI; an explicit `MAP_REGISTRY`
 * override stays loud, because silently ignoring it would be worse than failing.
 */
export async function loadRegistryResilient(
  storage: Storage,
  options: RegistrySourceOptions = {},
): Promise<LoadedRegistry> {
  const source = await resolveRegistrySource(storage, options);
  try {
    return { document: await loadRegistry(storage, source), source };
  } catch (error) {
    if (source.kind !== "cache") throw error;
    const bundled: RegistrySource = {
      kind: "bundled",
      path: options.bundledPath ?? bundledRegistryPath(),
    };
    return {
      document: await loadRegistry(storage, bundled),
      source: bundled,
      degradedFrom: source,
    };
  }
}

export async function loadRegistry(
  storage: Storage,
  source: RegistrySource,
): Promise<RegistryDocument> {
  let json: string;
  try {
    json = await storage.readFile(source.path);
  } catch {
    throw new Error(
      `could not read the pattern registry (${source.kind}: ${source.path}). ` +
        "Run 'map update' to download it, or reinstall the CLI.",
    );
  }
  try {
    return parseRegistry(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `invalid pattern registry (${source.kind}: ${source.path}): ${message}. ` +
        "Run 'map update' to re-download it.",
    );
  }
}

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}
