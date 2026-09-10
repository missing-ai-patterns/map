/** Agents adapter → AGENTS.md (the cross-tool AGENTS.md convention). */

import type { Context } from "../context.ts";
import type { Adapter } from "./base.ts";
import { renderSections, visibleDocuments } from "./base.ts";

export const agentsAdapter: Adapter = {
  id: "agents",
  bannerStyle: "html",
  compile(context: Context): string {
    const docs = visibleDocuments(context, "agents");
    return `# ${context.project.name} — Agent Guide

Instructions for AI coding agents working in this repository.

${renderSections(docs)}
`;
  },
};
