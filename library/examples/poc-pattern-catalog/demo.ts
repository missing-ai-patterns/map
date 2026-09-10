#!/usr/bin/env node
/**
 * POC — consuming the MAP registry programmatically.
 *
 * The registry (docs/specs/registry.md) is the machine-readable catalog this
 * repository publishes. This script reads it and answers a practical question:
 * "which retrieval patterns exist, and which are written?"
 *
 * It prefers a locally built registry (node scripts/build-registry.ts) and
 * falls back to the latest published release. Runs on Node >= 22, no deps:
 *
 *   node examples/poc-pattern-catalog/demo.ts [category]
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY_URL =
  "https://github.com/rajanbor/map/releases/latest/download/registry.json";

interface Entry {
  id: string;
  name: string;
  category: string;
  status: string;
  summary?: string;
  score?: Record<string, number>;
}

const localPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "registry.json",
);

let json: string;
try {
  json = await readFile(localPath, "utf8");
  console.log(`registry: ${localPath} (local build)\n`);
} catch {
  console.log(`registry: ${REGISTRY_URL}\n`);
  json = await (await fetch(REGISTRY_URL)).text();
}

const { patterns } = JSON.parse(json) as { patterns: Entry[] };
const category = process.argv[2] ?? "retrieval";
const matches = patterns.filter((p) => p.category === category);

console.log(`${matches.length} ${category} pattern(s):\n`);
for (const p of matches) {
  const icon = p.status === "published" ? "✅" : p.status === "in-progress" ? "🟡" : "⬜";
  console.log(`${icon} ${p.id} — ${p.name}`);
  if (p.summary) console.log(`   ${p.summary}`);
  if (p.score) {
    const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
    console.log(`   Complexity ${stars(p.score["complexity"] ?? 0)} · Readiness ${stars(p.score["productionReadiness"] ?? 0)}`);
  }
}
