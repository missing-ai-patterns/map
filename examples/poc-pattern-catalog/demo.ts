/**
 * POC — programmatic use of the MAP Knowledge Base (Module 1).
 *
 * Loads the repo's pattern catalog and renders a decision brief you could paste into
 * an ADR or feed to an AI agent as grounding context. Run from the repo root:
 *
 *   node examples/poc-pattern-catalog/demo.ts [query]
 */

import {
  MarkdownKnowledgeBase,
  FileSystemStorage,
  defaultPatternsDir,
} from "../../cli/src/index.ts";

const query = process.argv[2] ?? "chunk";

const kb = new MarkdownKnowledgeBase(defaultPatternsDir(), new FileSystemStorage());
const matches = await kb.find({ text: query });

if (matches.length === 0) {
  console.log(`No published pattern matches "${query}" yet — see ROADMAP.md.`);
  process.exit(0);
}

console.log(`# Decision brief: patterns matching "${query}"\n`);
for (const pattern of matches) {
  const entry = kb.entry(pattern.id);
  console.log(`## ${pattern.name} (\`${pattern.id}\`)`);
  console.log(pattern.description + "\n");
  console.log(`- Maturity: ${entry?.maturity ?? pattern.productionReadiness}`);
  if (entry?.score) {
    console.log(
      `- MAP Score: complexity ${entry.score.complexity}/5, latency ${entry.score.latency}/5, cost ${entry.score.cost}/5, accuracy ${entry.score.accuracyImpact}/5, readiness ${entry.score.productionReadiness}/5`,
    );
  }
  if (pattern.compatiblePatterns.length > 0) {
    console.log(`- Related: ${pattern.compatiblePatterns.join(", ")}`);
  }
  for (const ref of pattern.implementationReferences) {
    console.log(`- ${ref.label}: ${ref.location}`);
  }
  console.log();
}
