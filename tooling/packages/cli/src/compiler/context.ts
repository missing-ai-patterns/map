/**
 * The internal context model — MAP's "AST".
 *
 * Loaders parse `.map` into a `Context`; adapters read a `Context` and never touch the
 * filesystem. Keeping this model between the two halves is what lets new sources and
 * new targets evolve independently.
 */

import type { Priority } from "./frontmatter.ts";

export interface Document {
  /** Path relative to `.map/`, e.g. "patterns/backend.md". */
  readonly path: string;
  /** Human title: the first `#` heading, or derived from the file name. */
  readonly title: string;
  /** Markdown body with frontmatter stripped. */
  readonly body: string;
  /** Targets this document belongs to; `null` means "all". */
  readonly targets: readonly string[] | null;
  readonly priority: Priority;
}

export interface Context {
  readonly project: { readonly name: string };
  readonly documents: readonly Document[];
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/** Documents visible to `target`, high priority first, then load order. */
export function documentsForTarget(context: Context, target: string): readonly Document[] {
  return context.documents
    .filter((doc) => doc.targets === null || doc.targets.includes(target))
    .map((doc, index) => ({ doc, index }))
    .sort((a, b) => {
      const byPriority = PRIORITY_RANK[a.doc.priority] - PRIORITY_RANK[b.doc.priority];
      return byPriority !== 0 ? byPriority : a.index - b.index;
    })
    .map((entry) => entry.doc);
}
