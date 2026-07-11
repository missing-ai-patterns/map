#!/usr/bin/env node
/**
 * Builds the MAP website into dist/: copies site/ and renders the catalog
 * section of index.html from the published registry.
 *
 * The registry is the same artifact every MAP tool consumes
 * (https://github.com/missing-ai-patterns/map/releases/latest/download/registry.json);
 * REGISTRY_URL overrides it, REGISTRY_FILE reads a local file instead (offline dev).
 *
 * Fails loudly when the registry can't be fetched or parsed — GitHub Pages then
 * keeps serving the previous deploy; we never publish an empty catalog.
 *
 * No dependencies. Run: node scripts/build.mjs
 */

import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = join(root, "site");
const distDir = join(root, "dist");

const DEFAULT_REGISTRY_URL =
  "https://github.com/missing-ai-patterns/map/releases/latest/download/registry.json";

const registry = await loadRegistry();
validate(registry);

const published = registry.patterns.filter((p) => p.status === "published");
const planned = registry.patterns.filter((p) => p.status !== "published");

let html = await readFile(join(siteDir, "index.html"), "utf8");
html = html
  .replace("<!--STATS-->", stats(registry, published))
  .replace("<!--CATALOG-->", catalog(published, planned))
  .replace("<!--FOOTER-->", footer(registry));

await mkdir(distDir, { recursive: true });
await cp(siteDir, distDir, { recursive: true });
await writeFile(join(distDir, "index.html"), html);
process.stdout.write(
  `built dist/ — catalog v${registry.source.version}, ` +
    `${published.length} published / ${registry.patterns.length} total.\n`,
);

async function loadRegistry() {
  const file = process.env.REGISTRY_FILE;
  if (file !== undefined && file !== "") {
    return JSON.parse(await readFile(file, "utf8"));
  }
  const url = process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL;
  process.stdout.write(`fetching ${url}\n`);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`registry download failed: HTTP ${response.status}`);
  return await response.json();
}

function validate(doc) {
  if (doc?.schemaVersion !== 1 || !Array.isArray(doc.patterns) || doc.patterns.length === 0) {
    throw new Error("registry is empty or has an unsupported schemaVersion");
  }
}

function stats(doc, publishedEntries) {
  return (
    `${publishedEntries.length} published · ${doc.patterns.length} in the target catalog · ` +
    `registry v${escapeHtml(doc.source.version)}`
  );
}

function catalog(publishedEntries, plannedEntries) {
  const byCategory = new Map();
  for (const entry of publishedEntries) {
    const group = byCategory.get(entry.category) ?? [];
    group.push(entry);
    byCategory.set(entry.category, group);
  }

  const sections = [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, entries]) => {
      const items = entries
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(
          (entry) => `      <li>
        <a class="name" href="${patternUrl(entry.id)}">${escapeHtml(entry.name)}</a>
        <span class="summary">${escapeHtml(entry.summary ?? "")}</span>
        ${entry.score ? `<span class="score">${escapeHtml(scoreLine(entry.score))}</span>` : ""}
      </li>`,
        )
        .join("\n");
      return `    <div class="category">
      <h3>${escapeHtml(category)} <span class="count">${entries.length} published</span></h3>
      <ul class="patterns">
${items}
      </ul>
    </div>`;
    })
    .join("\n");

  const plannedList = plannedEntries
    .map((entry) => `        <li>${escapeHtml(entry.id)}</li>`)
    .join("\n");

  return `${sections}
    <details class="planned">
      <summary>${plannedEntries.length} more patterns on the roadmap</summary>
      <ul>
${plannedList}
      </ul>
    </details>`;
}

/** MAP Score as a compact star line (see map's docs/specs/map-score.md). */
function scoreLine(score) {
  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  return (
    `Complexity ${stars(score.complexity)} · Latency ${stars(score.latency)} · ` +
    `Cost ${stars(score.cost)} · Accuracy ${stars(score.accuracyImpact)} · ` +
    `Production ${stars(score.productionReadiness)}`
  );
}

function patternUrl(id) {
  return `https://github.com/missing-ai-patterns/map/tree/main/patterns/${encodeURI(id)}/`;
}

function footer(doc) {
  const built = new Date().toISOString().slice(0, 10);
  return `Catalog v${escapeHtml(doc.source.version)}, built ${built}. `;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
