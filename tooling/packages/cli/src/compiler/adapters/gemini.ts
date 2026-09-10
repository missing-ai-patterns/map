/** Gemini adapter → GEMINI.md (Google Gemini CLI context file). */

import type { Context } from "../context.ts";
import type { Adapter } from "./base.ts";
import { renderSections, visibleDocuments } from "./base.ts";

export const geminiAdapter: Adapter = {
  id: "gemini",
  bannerStyle: "html",
  compile(context: Context): string {
    const docs = visibleDocuments(context, "gemini");
    return `# ${context.project.name}

Project context for Gemini. Compiled from \`.map/\`.

${renderSections(docs)}
`;
  },
};
