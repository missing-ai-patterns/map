/**
 * Resolves the compiler's view of `map.config.json`.
 *
 * `sources`/`targets` are optional on `MapConfig` (a v2 workspace has neither), so the
 * compiler always reads through this resolver: absent keys fall back to the shared
 * `DEFAULT_SOURCES`/`DEFAULT_TARGETS`, and every target gets an explicit adapter id
 * (defaulting to the target's key). Downstream code never deals with `undefined`.
 */

import type { MapConfig } from "../config/index.ts";
import { DEFAULT_SOURCES, DEFAULT_TARGETS } from "../config/index.ts";

export interface ResolvedTarget {
  readonly id: string;
  readonly adapter: string;
  readonly output: string;
}

export interface ResolvedCompilerConfig {
  readonly sources: readonly string[];
  readonly targets: readonly ResolvedTarget[];
}

export function resolveCompilerConfig(config: MapConfig): ResolvedCompilerConfig {
  const sources = config.sources ?? DEFAULT_SOURCES;
  const rawTargets = config.targets ?? DEFAULT_TARGETS;
  const targets = Object.entries(rawTargets).map(([id, target]) => ({
    id,
    adapter: target.adapter ?? id,
    output: target.output,
  }));
  return { sources, targets };
}
