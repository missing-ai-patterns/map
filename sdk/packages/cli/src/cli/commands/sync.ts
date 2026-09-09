/**
 * `map sync` — compile `.map/` into every configured AI context file.
 *
 * This is the heart of the "compiler, not generator" model: developers edit only the
 * markdown under `.map/`, then `sync` regenerates CLAUDE.md, AGENTS.md, GEMINI.md,
 * the Cursor rule, and the Copilot instructions. Generated files are always
 * overwritten — they are outputs, not sources. The inputs and outputs are declared by
 * `sources`/`targets` in `map.config.json` (see config/), defaulting when absent.
 */

import { join, dirname } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import { MAP_DIR, CONFIG_FILE, parseConfig } from "../../config/index.ts";
import { loadContext, compile, resolveCompilerConfig } from "../../compiler/index.ts";

export const syncCommand: Command = {
  name: "sync",
  summary: "Compile .map/ into the AI context files (CLAUDE.md, AGENTS.md, …).",
  usage: "map sync",

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { cwd, services, reporter } = ctx;
    const { storage, adapters } = services;

    const mapDir = join(cwd, MAP_DIR);
    const configPath = join(mapDir, CONFIG_FILE);

    if (!(await storage.exists(configPath))) {
      reporter.error(`no ${MAP_DIR}/${CONFIG_FILE} found`);
      reporter.info("Run 'map init' to create the workspace.");
      return FAILED;
    }

    let resolved;
    let projectName: string;
    try {
      const config = parseConfig(await storage.readFile(configPath));
      resolved = resolveCompilerConfig(config);
      projectName = config.project.name;
    } catch (error) {
      reporter.error(`invalid ${CONFIG_FILE}: ${errorMessage(error)}`);
      return FAILED;
    }

    const context = await loadContext(storage, mapDir, {
      projectName,
      sources: resolved.sources,
    });
    reporter.info(`Loaded ${context.documents.length} document(s) from ${MAP_DIR}/.`);

    const { outputs, unknownTargets } = compile(context, resolved, adapters);

    for (const target of unknownTargets) {
      reporter.warn(
        `target '${target}' has no adapter; supported: ${adapters.ids().join(", ")}`,
      );
    }

    for (const output of outputs) {
      const abs = join(cwd, output.path);
      await storage.ensureDir(dirname(abs));
      await storage.writeFile(abs, output.content, { overwrite: true });
      reporter.info(`generated ${output.path} (${output.target})`);
    }

    if (outputs.length === 0) {
      reporter.warn("no outputs generated; check the 'targets' in map.config.json.");
      return unknownTargets.length > 0 ? FAILED : OK;
    }

    reporter.success(`sync complete — ${outputs.length} file(s) generated.`);
    return unknownTargets.length > 0 ? FAILED : OK;
  },
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
