/**
 * `map update` — refresh the local pattern registry.
 *
 * Downloads the latest registry from the map repository's releases (or from
 * `--registry <url>` / a `MAP_REGISTRY` URL), validates it, and writes it to
 * the user cache (`~/.map/registry.json`), which then takes precedence over the
 * snapshot bundled with the package. The only networked command; everything
 * else works offline.
 */

import { dirname } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import {
  parseRegistry,
  registryUpdateUrl,
  userRegistryCachePath,
} from "../../knowledge/index.ts";

export const updateCommand: Command = {
  name: "update",
  summary: "Download the latest pattern registry.",
  usage: "map update [--registry <url>]",
  options: [{ flags: "--registry <url>", description: "registry URL to download from" }],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { reporter, services } = ctx;
    const flagUrl = ctx.flags["registry"];
    const url = typeof flagUrl === "string" && flagUrl !== "" ? flagUrl : registryUpdateUrl();

    reporter.info(`Fetching ${url}`);

    let body: string;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        reporter.error(`Download failed: HTTP ${response.status} ${response.statusText}.`);
        return FAILED;
      }
      body = await response.text();
    } catch (error) {
      reporter.error(
        `Download failed: ${error instanceof Error ? error.message : String(error)}.`,
      );
      reporter.info("Check your network, or pass --registry <url>.");
      return FAILED;
    }

    let registry;
    try {
      registry = parseRegistry(body);
    } catch (error) {
      reporter.error(
        `Downloaded registry is invalid: ${error instanceof Error ? error.message : String(error)}.`,
      );
      return FAILED;
    }

    const cachePath = userRegistryCachePath();
    await services.storage.ensureDir(dirname(cachePath));
    await services.storage.writeFile(cachePath, body, { overwrite: true });

    const published = registry.patterns.filter((p) => p.status === "published").length;
    reporter.success(
      `Registry updated: ${registry.patterns.length} patterns (${published} published), ` +
        `catalog v${registry.source.version}, saved to ${cachePath}.`,
    );
    return OK;
  },
};
