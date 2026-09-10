/**
 * Adapter registry.
 *
 * The built-in adapters are registered here by id. Future work (plugins, custom
 * adapters, template packs) plugs in by adding to this registry rather than editing
 * the pipeline — see `registerAdapter`.
 */

import type { Adapter } from "./base.ts";
import { claudeAdapter } from "./claude.ts";
import { agentsAdapter } from "./agents.ts";
import { geminiAdapter } from "./gemini.ts";
import { cursorAdapter } from "./cursor.ts";
import { copilotAdapter } from "./copilot.ts";

export type { Adapter, BannerStyle } from "./base.ts";

const BUILTIN: readonly Adapter[] = [
  claudeAdapter,
  agentsAdapter,
  geminiAdapter,
  cursorAdapter,
  copilotAdapter,
];

/** A resolvable set of adapters keyed by id. Extensible for plugins later. */
export class AdapterRegistry {
  private readonly adapters = new Map<string, Adapter>();

  constructor(adapters: readonly Adapter[] = BUILTIN) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: Adapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): Adapter | undefined {
    return this.adapters.get(id);
  }

  ids(): readonly string[] {
    return [...this.adapters.keys()];
  }
}

export function defaultAdapterRegistry(): AdapterRegistry {
  return new AdapterRegistry();
}
