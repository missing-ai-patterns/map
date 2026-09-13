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
export type DocumentStatus =
  | "proposed"
  | "draft"
  | "active"
  | "accepted"
  | "rejected"
  | "superseded"
  | "deprecated"
  | "archived";

export interface Frontmatter {
  /** Typed document metadata; absent for legacy/untyped Markdown. */
  readonly kind?: string;
  readonly id?: string;
  readonly title?: string;
  readonly date?: string;
  readonly status?: DocumentStatus;
  readonly scope?: string | readonly string[];
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

  const kind = optionalString(data["kind"]);
  const id = optionalString(data["id"]);
  const title = optionalString(data["title"]);
  const date = optionalString(data["date"]);
  const status = isDocumentStatus(data["status"]) ? data["status"] : undefined;
  const scopeNode = data["scope"];
  const scope = typeof scopeNode === "string"
    ? scopeNode
    : Array.isArray(scopeNode)
      ? scopeNode.filter((item): item is string => typeof item === "string")
      : undefined;

  return {
    frontmatter: {
      targets,
      priority,
      ...(kind !== undefined && { kind }),
      ...(id !== undefined && { id }),
      ...(title !== undefined && { title }),
      ...(date !== undefined && { date }),
      ...(status !== undefined && { status }),
      ...(scope !== undefined && { scope }),
    },
    body,
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isDocumentStatus(value: unknown): value is DocumentStatus {
  return [
    "proposed",
    "draft",
    "active",
    "accepted",
    "rejected",
    "superseded",
    "deprecated",
    "archived",
  ].includes(value as DocumentStatus);
}
