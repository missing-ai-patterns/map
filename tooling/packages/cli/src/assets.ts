/**
 * Locates the installed package's own assets (templates/, registry-snapshot/,
 * package.json). Resolution walks up from this module until it finds
 * package.json, so it works both in development (src/assets.ts) and in the
 * published build (dist/). This is boot-time self-location, not project I/O —
 * the storage abstraction stays the door to the user's filesystem.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("could not locate the @missing-ai-patterns/cli package root");
    }
    dir = parent;
  }
  return dir;
}

export function packageVersion(): string {
  const manifest = JSON.parse(readFileSync(join(packageRoot(), "package.json"), "utf8")) as {
    version?: string;
  };
  return manifest.version ?? "0.0.0";
}

/** The `.map/` workspace scaffold shipped with the package. */
export function workspaceTemplateDir(): string {
  return join(packageRoot(), "templates", "workspace");
}

/** The registry snapshot bundled at build time (offline fallback). */
export function bundledRegistryPath(): string {
  return join(packageRoot(), "registry-snapshot", "registry.json");
}
