/**
 * Target adapter contract and shared rendering helpers.
 *
 * Each adapter knows how to turn the shared `Context` into one AI assistant's context
 * file. Adapters are pure: `compile` takes a context and returns a string. The pipeline
 * (compile.ts) handles filtering by target, the generated-file banner, and writing.
 *
 * Adding a new assistant is a matter of adding one adapter and registering it — no
 * changes to the loader, the context model, or the CLI.
 */

import type { Context, Document } from "../context.ts";
import { documentsForTarget } from "../context.ts";

/** How the "do not edit" banner is commented in this adapter's output. */
export type BannerStyle = "html" | "hash";

export interface Adapter {
  /** Target id; matches the key under `targets:` in map.yaml. */
  readonly id: string;
  readonly bannerStyle: BannerStyle;
  compile(context: Context): string;
}

/** Documents visible to this adapter, ordered by priority then load order. */
export function visibleDocuments(context: Context, target: string): readonly Document[] {
  return documentsForTarget(context, target);
}

/** Render a list of documents as markdown sections separated by rules. */
export function renderSections(documents: readonly Document[]): string {
  if (documents.length === 0) {
    return "_No context documents matched this target yet. Add markdown files under `.map/`._";
  }
  return documents.map((doc) => doc.body.trim()).join("\n\n---\n\n");
}
