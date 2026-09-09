/** Cursor adapter → .cursor/rules/map.mdc (Cursor "Project Rules" MDC file). */

import type { Context } from "../context.ts";
import type { Adapter } from "./base.ts";
import { renderSections, visibleDocuments } from "./base.ts";

export const cursorAdapter: Adapter = {
  id: "cursor",
  bannerStyle: "html",
  compile(context: Context): string {
    const docs = visibleDocuments(context, "cursor");
    // MDC files open with their own frontmatter block; `alwaysApply` makes the rule
    // part of every request's context.
    return `---
description: ${context.project.name} project context (compiled by MAP)
globs:
alwaysApply: true
---

# ${context.project.name}

${renderSections(docs)}
`;
  },
};
