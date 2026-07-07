/**
 * `map patterns` — list and search the MAP pattern catalog.
 *
 * The first command powered by the Knowledge Base (Module 1). It searches names and
 * summaries, filters by category, and can emit JSON for scripts and agents.
 */

import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import type { Pattern, PatternCategory } from "../../domain/index.ts";
import { MarkdownKnowledgeBase } from "../../knowledge/index.ts";

const CATEGORIES: readonly PatternCategory[] = [
  "retrieval",
  "memory",
  "agents",
  "security",
  "context",
  "evaluation",
  "performance",
  "routing",
  "tool-calling",
  "observability",
];

export const patternsCommand: Command = {
  name: "patterns",
  summary: "List and search the MAP pattern catalog.",
  usage: "map patterns [query] [--category=<category>] [--json]",

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { services, reporter, args, flags } = ctx;
    const kb = services.knowledgeBase;

    const text = args[0];
    const category = flags["category"];
    if (category !== undefined) {
      if (typeof category !== "string" || !CATEGORIES.includes(category as PatternCategory)) {
        reporter.error(
          `Unknown category '${String(category)}'. Expected one of: ${CATEGORIES.join(", ")}.`,
        );
        return FAILED;
      }
    }

    await kb.load();
    const patterns = await kb.find({
      ...(text !== undefined ? { text } : {}),
      ...(category !== undefined ? { category: category as PatternCategory } : {}),
    });

    if (flags["json"] === true) {
      reporter.info(JSON.stringify(toJson(patterns, kb), null, 2));
      return OK;
    }

    if (patterns.length === 0) {
      reporter.warn("No patterns matched.");
      reporter.info(
        "The published catalog is still small — see the roadmap: https://github.com/rajanbor/map/blob/main/ROADMAP.md",
      );
      return OK;
    }

    for (const pattern of [...patterns].sort((a, b) => a.id.localeCompare(b.id))) {
      const entry = kb instanceof MarkdownKnowledgeBase ? kb.entry(pattern.id) : undefined;
      const maturity = entry?.maturity ?? pattern.productionReadiness;
      reporter.success(`${pattern.name} (${pattern.id}) — ${maturity}`);
      if (pattern.description) reporter.info(`  ${pattern.description}`);
      if (entry?.score) {
        const s = entry.score;
        reporter.info(
          `  Complexity ${stars(s.complexity)} · Latency ${stars(s.latency)} · Cost ${stars(s.cost)} · Accuracy ${stars(s.accuracyImpact)} · Readiness ${stars(s.productionReadiness)}`,
        );
      }
      reporter.info("");
    }
    reporter.info(`${patterns.length} pattern(s).`);
    return OK;
  },
};

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function toJson(patterns: readonly Pattern[], kb: unknown): unknown {
  return patterns.map((p) => {
    const entry = kb instanceof MarkdownKnowledgeBase ? kb.entry(p.id) : undefined;
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      summary: p.description,
      maturity: entry?.maturity ?? p.productionReadiness,
      score: entry?.score,
      related: p.compatiblePatterns,
      referenceImplementations: p.implementationReferences.map((r) => r.location),
    };
  });
}
