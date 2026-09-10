#!/usr/bin/env node
/**
 * Builds the MAP pattern registry (`registry.json`) from the repository content.
 *
 * Sources, merged in this order:
 *  1. `ROADMAP.md` — the target catalog; provides every entry with its status.
 *  2. `patterns/<category>/<slug>/pattern.yaml` — written patterns; these override
 *     the roadmap entry and add summary, score, guidance, and embedded files
 *     (`prompt.md`, `acceptance.md`) so tools can scaffold patterns offline.
 *
 * The output contract is documented in docs/specs/registry.md. Consumers (the MAP
 * CLI, the future website) read only this artifact — never the Markdown directly.
 *
 * Usage:
 *   node scripts/build-registry.ts [--out <path>] [--check]
 *
 * `--check` validates and prints a summary without writing anything (CI mode).
 * Runs on Node >= 22 (native TypeScript); no dependencies.
 */

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_VERSION = 1;
const REPOSITORY_URL = "https://github.com/rajanbor/map";

/** Roadmap section headings → pattern categories (mirrors `patterns/`). */
const CATEGORY_HEADINGS: Readonly<Record<string, string>> = {
  Retrieval: "retrieval",
  Memory: "memory",
  Agents: "agents",
  Security: "security",
  "Context Management": "context",
  Evaluation: "evaluation",
  Performance: "performance",
  Routing: "routing",
  "Tool Calling": "tool-calling",
  Observability: "observability",
};

const CATEGORIES = Object.values(CATEGORY_HEADINGS);

const STATUS_SYMBOLS: Readonly<Record<string, string>> = {
  "✅": "published",
  "🟡": "in-progress",
  "⬜": "planned",
};

/**
 * Names whose canonical slug differs from plain slugification. These are the ids
 * pattern cross-references use; keep in sync with the `pattern.yaml` files.
 */
const SLUG_OVERRIDES: Readonly<Record<string, string>> = {
  "Faithfulness / Groundedness Evaluation": "faithfulness-groundedness",
  "Tracing / Spans": "tracing",
};

const SCORE_DIMENSIONS = [
  "complexity",
  "latency",
  "cost",
  "accuracyImpact",
  "productionReadiness",
] as const;

/** Files embedded verbatim into published entries so `map add` works offline. */
const EMBEDDED_FILES = ["prompt.md", "acceptance.md"] as const;

interface RegistryEntry {
  id: string;
  name: string;
  category: string;
  status: string;
  summary?: string;
  maturity?: string;
  alsoKnownAs?: string[];
  score?: Record<string, number>;
  whenToUse?: string[];
  whenNotToUse?: string[];
  related?: string[];
  references?: string[];
  files?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// ROADMAP.md parsing
// ---------------------------------------------------------------------------

function parseRoadmap(markdown: string): RegistryEntry[] {
  const entries: RegistryEntry[] = [];
  let category: string | undefined;

  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      category = CATEGORY_HEADINGS[heading[1]!];
      continue;
    }
    if (category === undefined) continue;

    const item = line.match(/^-\s+(\S+)\s+(.+?)\s*$/);
    if (!item) continue;
    const status = STATUS_SYMBOLS[item[1]!];
    if (status === undefined) continue;

    const name = stripMarkdownLink(item[2]!);
    entries.push({ id: `${category}/${slugify(name)}`, name, category, status });
  }
  return entries;
}

/** `[Chunking](patterns/retrieval/chunking/)` → `Chunking`. */
function stripMarkdownLink(text: string): string {
  const link = text.match(/^\[(.+?)\]\(.+?\)$/);
  return link ? link[1]! : text;
}

function slugify(name: string): string {
  const override = SLUG_OVERRIDES[name];
  if (override !== undefined) return override;
  return name
    .replace(/\(.*?\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// pattern.yaml parsing (the subset of YAML the pattern contract uses)
// ---------------------------------------------------------------------------

interface PatternYaml {
  scalars: Record<string, string>;
  lists: Record<string, string[]>;
  score?: Record<string, number>;
}

function parsePatternYaml(text: string): PatternYaml {
  const scalars: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  let score: Record<string, number> | undefined;
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(/^([a-zA-Z_]+):\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;

    if (key === "score") {
      const values: Record<string, number> = {};
      while (i + 1 < lines.length) {
        const dim = lines[i + 1]!.match(/^\s+([a-zA-Z]+):\s*(\d+)\s*(#.*)?$/);
        if (!dim) break;
        values[dim[1]!] = Number(dim[2]);
        i++;
      }
      score = values;
      continue;
    }

    if (rawValue === "" && /^\s+-\s+/.test(lines[i + 1] ?? "")) {
      const items: string[] = [];
      while (i + 1 < lines.length) {
        const item = lines[i + 1]!.match(/^\s+-\s+(\S.*?)\s*$/);
        if (!item) break;
        items.push(unquote(item[1]!));
        i++;
      }
      lists[key!] = items;
      continue;
    }

    if (rawValue === ">" || rawValue === ">-" || rawValue === "") {
      const block: string[] = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]!)) {
        block.push(lines[i + 1]!.trim());
        i++;
      }
      if (block.length > 0) scalars[key!] = block.join(" ");
    } else {
      scalars[key!] = unquote(rawValue!);
    }
  }
  return { scalars, lists, ...(score !== undefined && { score }) };
}

function unquote(value: string): string {
  const quoted = value.match(/^"(.*)"$|^'(.*)'$/);
  return quoted ? (quoted[1] ?? quoted[2] ?? "") : value;
}

// ---------------------------------------------------------------------------
// Build + validate
// ---------------------------------------------------------------------------

async function entriesFromPatternDirs(errors: string[]): Promise<RegistryEntry[]> {
  const entries: RegistryEntry[] = [];
  const patternsDir = join(REPO_ROOT, "patterns");

  for (const category of CATEGORIES) {
    const categoryDir = join(patternsDir, category);
    if (!existsSync(categoryDir)) continue;

    for (const dirent of await readdir(categoryDir, { withFileTypes: true })) {
      if (!dirent.isDirectory() || dirent.name.startsWith("_")) continue;
      const slug = dirent.name;
      const yamlPath = join(categoryDir, slug, "pattern.yaml");
      if (!existsSync(yamlPath)) continue;

      const where = `patterns/${category}/${slug}`;
      const parsed = parsePatternYaml(await readFile(yamlPath, "utf8"));
      const { scalars, lists, score } = parsed;

      const id = scalars["id"] ?? `${category}/${slug}`;
      if (scalars["category"] !== undefined && scalars["category"] !== category) {
        errors.push(`${where}: category '${scalars["category"]}' does not match directory`);
      }

      if (score !== undefined) {
        for (const dim of SCORE_DIMENSIONS) {
          const value = score[dim];
          if (value === undefined || value < 1 || value > 5) {
            errors.push(`${where}: score.${dim} must be an integer 1..5 (got ${value})`);
          }
        }
      }

      const files: Record<string, string> = {};
      for (const file of EMBEDDED_FILES) {
        const path = join(categoryDir, slug, file);
        if (existsSync(path)) files[file] = await readFile(path, "utf8");
      }

      entries.push({
        id,
        name: scalars["name"] ?? slug,
        category,
        status: "published",
        ...(scalars["summary"] !== undefined && { summary: scalars["summary"] }),
        ...(scalars["maturity"] !== undefined && { maturity: scalars["maturity"] }),
        ...(lists["also_known_as"] !== undefined && { alsoKnownAs: lists["also_known_as"] }),
        ...(score !== undefined && { score }),
        ...(lists["when_to_use"] !== undefined && { whenToUse: lists["when_to_use"] }),
        ...(lists["when_not_to_use"] !== undefined && { whenNotToUse: lists["when_not_to_use"] }),
        ...(lists["related"] !== undefined && { related: lists["related"] }),
        ...(lists["references"] !== undefined && { references: lists["references"] }),
        ...(Object.keys(files).length > 0 && { files }),
      });
    }
  }
  return entries;
}

async function build(): Promise<{ registry: object; errors: string[]; count: number }> {
  const errors: string[] = [];

  const roadmapPath = join(REPO_ROOT, "ROADMAP.md");
  const roadmapEntries = existsSync(roadmapPath)
    ? parseRoadmap(await readFile(roadmapPath, "utf8"))
    : [];
  if (roadmapEntries.length === 0) errors.push("ROADMAP.md yielded no catalog entries");

  const writtenEntries = await entriesFromPatternDirs(errors);

  const byId = new Map<string, RegistryEntry>();
  for (const entry of roadmapEntries) byId.set(entry.id, entry);
  for (const entry of writtenEntries) byId.set(entry.id, entry);

  const patterns = [...byId.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );

  // Cross-reference check: every `related` id must resolve in the catalog.
  for (const entry of patterns) {
    for (const related of entry.related ?? []) {
      if (!byId.has(related)) {
        errors.push(`${entry.id}: related id '${related}' not found in the catalog`);
      }
    }
  }

  const version = (await readFile(join(REPO_ROOT, "VERSION"), "utf8")).trim();
  const registry = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: { repository: REPOSITORY_URL, version },
    categories: CATEGORIES,
    patterns,
  };
  return { registry, errors, count: patterns.length };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const check = args.includes("--check");
const outIndex = args.indexOf("--out");
const outPath = outIndex >= 0 ? args[outIndex + 1] : join(REPO_ROOT, "dist", "registry.json");

const { registry, errors, count } = await build();

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`error: ${error}\n`);
  process.stderr.write(`registry build failed with ${errors.length} error(s).\n`);
  process.exit(1);
}

if (check) {
  process.stdout.write(`registry OK: ${count} patterns.\n`);
} else {
  if (outPath === undefined) {
    process.stderr.write("error: --out requires a path\n");
    process.exit(1);
  }
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(registry, null, 2)}\n`);
  process.stdout.write(`wrote ${outPath} (${count} patterns).\n`);
}
