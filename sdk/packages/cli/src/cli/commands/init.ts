/**
 * `map init` — create (or migrate) the `.map/` workspace.
 *
 * The workspace is rendered from the package's `templates/workspace/` tree
 * (see scaffold/), so its layout is data, not command logic. Init
 * self-configures: it detects the project's languages from marker files and
 * fills `map.config.json` accordingly. Existing files are never overwritten
 * unless `--force` is passed or the user confirms interactively.
 *
 * A legacy v1 workspace (`config.yaml` + `project.yaml`) is migrated: the new
 * config is generated fresh from detection (the old files were generated too),
 * and the legacy files are removed after confirmation.
 */

import { join, basename } from "node:path";
import { confirm } from "@inquirer/prompts";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK } from "../command.ts";
import {
  MAP_DIR,
  CONFIG_FILE,
  CONFIG_SCHEMA_VERSION,
  LEGACY_WORKSPACE_FILES,
} from "../../config/index.ts";
import { detectProject } from "../../project/index.ts";
import type { ProjectFacts } from "../../project/index.ts";
import { renderTemplateDir } from "../../scaffold/index.ts";
import { workspaceTemplateDir } from "../../assets.ts";

export const initCommand: Command = {
  name: "init",
  summary: "Create a .map/ workspace in the current project.",
  usage: "map init [--force] [--yes]",
  options: [
    { flags: "-f, --force", description: "overwrite existing workspace files" },
    { flags: "-y, --yes", description: "answer yes to prompts (non-interactive)" },
  ],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { cwd, services, reporter } = ctx;
    const { storage } = services;
    const force = ctx.flags["force"] === true;
    const yes = ctx.flags["yes"] === true;

    const mapDir = join(cwd, MAP_DIR);
    reporter.info(`Initializing MAP in ${mapDir}`);

    let overwrite = force;
    if (await storage.exists(mapDir)) {
      if (!force && isInteractive()) {
        overwrite = await confirm({
          message: "Existing .map/ found. Overwrite its generated files?",
          default: false,
        });
      }
      reporter.info(
        overwrite
          ? "Existing .map/ found; regenerating."
          : "Existing .map/ found; keeping your files (use --force to regenerate).",
      );
      await migrateLegacyWorkspace(ctx, mapDir, force || yes);
    }

    // Self-configure: detect the project and fill the config template.
    const facts = await detectProject(cwd, storage);
    if (facts.languages.length > 0) {
      reporter.info(
        `Detected ${facts.languages.join(", ")}; configuring analyzers: ${facts.analyzers.join(", ")}.`,
      );
    } else {
      reporter.info("No known project markers detected; using defaults.");
    }

    const rendered = await renderTemplateDir(
      storage,
      workspaceTemplateDir(),
      mapDir,
      templateVars(basename(cwd), facts),
      { overwrite },
    );

    let created = 0;
    let skipped = 0;
    for (const file of rendered) {
      if (file.written) {
        created += 1;
        reporter.info(`created ${MAP_DIR}/${file.path}`);
      } else {
        skipped += 1;
      }
    }
    if (skipped > 0) {
      reporter.warn(`${skipped} file(s) already existed and were kept (use --force to overwrite).`);
    }

    reporter.success(`MAP workspace ready. ${created} file(s) written.`);
    reporter.info("Next: 'map analyze' to detect your AI architecture, 'map patterns' to browse the catalog.");
    return OK;
  },
};

/** Template variables; values are JSON fragments (the template is JSON). */
function templateVars(
  projectName: string,
  facts: ProjectFacts,
): Record<string, string> {
  return {
    schemaVersion: JSON.stringify(CONFIG_SCHEMA_VERSION),
    projectName: JSON.stringify(projectName),
    createdAt: JSON.stringify(new Date().toISOString()),
    languages: JSON.stringify(facts.languages),
    analyzers: JSON.stringify(facts.analyzers),
    include: JSON.stringify(facts.include),
    exclude: JSON.stringify(facts.exclude),
  };
}

/**
 * Removes v1 workspace files (config.yaml, project.yaml, knowledge/patterns.json)
 * after consent — `--force`/`--yes`, or an interactive confirmation. Without
 * consent the files are kept and the user is told how to migrate.
 */
async function migrateLegacyWorkspace(
  ctx: CommandContext,
  mapDir: string,
  consented: boolean,
): Promise<void> {
  const { storage } = ctx.services;
  const present: string[] = [];
  for (const file of LEGACY_WORKSPACE_FILES) {
    if (await storage.exists(join(mapDir, file))) present.push(file);
  }
  if (present.length === 0) return;

  ctx.reporter.warn(
    `Legacy workspace files found (${present.join(", ")}); the workspace format is now ${CONFIG_FILE}.`,
  );

  let migrate = consented;
  if (!migrate && isInteractive()) {
    migrate = await confirm({
      message: `Remove the legacy files? (${CONFIG_FILE} replaces them)`,
      default: true,
    });
  }
  if (!migrate) {
    ctx.reporter.warn("Keeping legacy files. Re-run with --yes (or --force) to migrate.");
    return;
  }

  for (const file of present) {
    await storage.removeFile(join(mapDir, file));
    ctx.reporter.info(`removed legacy ${MAP_DIR}/${file}`);
  }
}

function isInteractive(): boolean {
  return process.stdout.isTTY === true && process.stdin.isTTY === true;
}
