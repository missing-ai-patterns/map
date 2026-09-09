/** Claude adapter → CLAUDE.md (Anthropic's project context file). */

import type { Context } from "../context.ts";
import type { Adapter } from "./base.ts";
import { renderSections, visibleDocuments } from "./base.ts";

export const claudeAdapter: Adapter = {
  id: "claude",
  bannerStyle: "html",
  compile(context: Context): string {
    const docs = visibleDocuments(context, "claude");
    return `# ${context.project.name}

Project context for Claude. This file is compiled from \`.map/\`.

${renderSections(docs)}
`;
  },
};
