#!/usr/bin/env node
/**
 * Refreshes registry-snapshot/registry.json — the offline registry bundled
 * with the published package. Run before a release.
 *
 * Sources:
 *   - MAP_REPO=<path to a local map checkout>: builds the registry from source
 *     (node $MAP_REPO/scripts/build-registry.ts), useful while developing.
 *   - otherwise: downloads the latest published registry from the map
 *     repository's releases.
 */

import { execFileSync } from "node:child_process";
import { writeFile, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(packageDir, "registry-snapshot", "registry.json");
const DEFAULT_REGISTRY_URL =
  "https://github.com/missing-ai-patterns/patterns/releases/latest/download/registry.json";

const mapRepo = process.env["MAP_REPO"];

if (mapRepo !== undefined && mapRepo !== "") {
  execFileSync(
    "node",
    [join(mapRepo, "scripts", "build-registry.ts"), "--out", snapshotPath],
    { stdio: "inherit" },
  );
} else {
  const url = process.env["MAP_REGISTRY"]?.startsWith("http")
    ? process.env["MAP_REGISTRY"]
    : DEFAULT_REGISTRY_URL;
  process.stdout.write(`fetching ${url}\n`);
  const response = await fetch(url);
  if (!response.ok) {
    process.stderr.write(`download failed: HTTP ${response.status}\n`);
    process.exit(1);
  }
  const body = await response.text();
  JSON.parse(body); // fail fast on a corrupt download
  await writeFile(snapshotPath, body);
}

const { patterns } = JSON.parse(await readFile(snapshotPath, "utf8")) as {
  patterns: unknown[];
};
process.stdout.write(`snapshot updated: ${patterns.length} patterns.\n`);
