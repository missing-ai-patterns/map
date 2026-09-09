/** Copilot adapter → .github/copilot-instructions.md (GitHub Copilot). */

import type { Context } from "../context.ts";
import type { Adapter } from "./base.ts";
import { renderSections, visibleDocuments } from "./base.ts";

export const copilotAdapter: Adapter = {
  id: "copilot",
  bannerStyle: "html",
  compile(context: Context): string {
    const docs = visibleDocuments(context, "copilot");
    return `# Copilot Instructions — ${context.project.name}

Guidance for GitHub Copilot in this repository. Compiled from \`.map/\`.

${renderSections(docs)}
`;
  },
};
