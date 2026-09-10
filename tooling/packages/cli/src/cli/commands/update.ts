/**
 * `map update` — refresh the local pattern registry.
 *
 * Downloads the latest registry from the map repository's releases (or from
 * `--registry <url>` / a `MAP_REGISTRY` URL), validates it, and writes it to
 * the user cache (`~/.map/registry.json`), which then takes precedence over the
 * snapshot bundled with the package. Reports what changed (catalog version and
 * published count, before → after). `--check` fetches and compares without
 * writing anything — for CI and scripts. The only networked command; everything
 * else works offline. Downloads abort after 30 seconds.
 */

import { dirname } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import type { RegistryDocument } from "../../knowledge/index.ts";
import {
  loadRegistryResilient,
  parseRegistry,
  registryUpdateUrl,
  userRegistryCachePath,
} from "../../knowledge/index.ts";

const DOWNLOAD_TIMEOUT_MS = 30_000;

export const updateCommand: Command = {
  name: "update",
  summary: "Download the latest pattern registry.",
  usage: "map update [--registry <url>] [--check]",
  options: [
    { flags: "--registry <url>", description: "registry URL to download from" },
    { flags: "--check", description: "report whether an update is available; write nothing" },
  ],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { reporter, services } = ctx;
    const flagUrl = ctx.flags["registry"];
    const url = typeof flagUrl === "string" && flagUrl !== "" ? flagUrl : registryUpdateUrl();
    const checkOnly = ctx.flags["check"] === true;

    reporter.info(`Fetching ${url}`);

    let body: string;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
      if (!response.ok) {
        reporter.error(`Download failed: HTTP ${response.status} ${response.statusText}.`);
        return FAILED;
      }
      body = await response.text();
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        reporter.error(`Download timed out after ${DOWNLOAD_TIMEOUT_MS / 1000}s.`);
      } else {
        reporter.error(
          `Download failed: ${error instanceof Error ? error.message : String(error)}.`,
        );
      }
      reporter.info("Check your network, or pass --registry <url>.");
      return FAILED;
    }

    let registry: RegistryDocument;
    try {
      registry = parseRegistry(body);
    } catch (error) {
      reporter.error(
        `Downloaded registry is invalid: ${error instanceof Error ? error.message : String(error)}.`,
      );
      return FAILED;
    }

    const current = await currentRegistry(ctx);
    const delta = describeDelta(current, registry);

    if (checkOnly) {
      if (delta === undefined) {
        reporter.success(`Already up to date: ${describe(registry)}.`);
      } else {
        reporter.info(`Update available: ${delta}.`);
        reporter.info("Run 'map update' to apply it.");
      }
      return OK;
    }

    const cachePath = userRegistryCachePath();
    await services.storage.ensureDir(dirname(cachePath));
    await services.storage.writeFile(cachePath, body, { overwrite: true });

    reporter.success(
      `Registry updated: ${describe(registry)}, saved to ${cachePath}` +
        (delta !== undefined ? ` (${delta})` : "") +
        ".",
    );
    return OK;
  },
};

/** The registry the CLI is using right now (override/cache/bundled), if loadable. */
async function currentRegistry(ctx: CommandContext): Promise<RegistryDocument | undefined> {
  try {
    return (await loadRegistryResilient(ctx.services.storage)).document;
  } catch {
    return undefined;
  }
}

function describe(registry: RegistryDocument): string {
  return `${registry.patterns.length} patterns (${published(registry)} published), catalog v${registry.source.version}`;
}

function describeDelta(
  current: RegistryDocument | undefined,
  next: RegistryDocument,
): string | undefined {
  if (current === undefined) return `catalog v${next.source.version}`;
  if (
    current.source.version === next.source.version &&
    published(current) === published(next) &&
    current.patterns.length === next.patterns.length
  ) {
    return undefined;
  }
  return (
    `catalog v${current.source.version} → v${next.source.version}, ` +
    `published ${published(current)} → ${published(next)}`
  );
}

function published(registry: RegistryDocument): number {
  return registry.patterns.filter((p) => p.status === "published").length;
}
