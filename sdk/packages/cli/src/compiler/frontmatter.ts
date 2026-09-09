/**
 * YAML frontmatter parsing for `.map` documents.
 *
 * A document may open with a `---` fenced block carrying compiler directives:
 *
 *   ---
 *   targets: [claude, cursor]
 *   priority: high
 *   ---
 *
 * Only the directives MAP understands are surfaced; the rest is ignored. The body is
 * returned with the frontmatter stripped.
 */

import { parseYaml } from "./yaml-parse.ts";

export type Priority = "high" | "normal" | "low";

export interface Frontmatter {
  /** Targets this document is included in; `null` means "all targets". */
  readonly targets: readonly string[] | null;
  readonly priority: Priority;
}

export interface ParsedDocument {
  readonly frontmatter: Frontmatter;
  readonly body: string;
}

const DEFAULT: Frontmatter = { targets: null, priority: "normal" };

export function parseFrontmatter(source: string): ParsedDocument {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) return { frontmatter: DEFAULT, body: source.trim() };

  const body = source.slice(match[0].length).trim();
  const data = parseYaml(match[1]!);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { frontmatter: DEFAULT, body };
  }

  const targetsNode = data["targets"];
  const targets = Array.isArray(targetsNode)
    ? targetsNode.filter((t): t is string => typeof t === "string")
    : null;

  const priorityNode = data["priority"];
  const priority: Priority =
    priorityNode === "high" || priorityNode === "low" ? priorityNode : "normal";

  return { frontmatter: { targets, priority }, body };
}
