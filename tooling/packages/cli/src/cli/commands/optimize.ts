/** `map optimize` — inspect and optionally enforce the workspace token budget. */

import { basename, dirname, join, resolve } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { FAILED, OK } from "../command.ts";
import { CONFIG_FILE, MAP_DIR, parseConfig } from "../../config/index.ts";
import type { TokenOptimizerConfig } from "../../config/index.ts";
import { analyzeTokenUsage } from "../../optimization/index.ts";

const DEFAULT_BUDGET = 12_000;
const DEFAULT_INCLUDE = ["**/*.md"] as const;
const DEFAULT_EXCLUDE = ["reports/**", "cache/**"] as const;

export const optimizeCommand: Command = {
  name: "optimize",
  summary: "Measure and optimize the AI context token budget.",
  usage: "map optimize [path] [--budget <tokens>] [--save] [--json] [--check]",
  args: "[path]",
  options: [
    { flags: "--budget <tokens>", description: "override the configured token budget" },
    { flags: "--save", description: "save the report to .map/reports/token-optimization.json" },
    { flags: "--json", description: "print the complete report as JSON" },
    { flags: "--check", description: "exit non-zero when the budget is exceeded" },
  ],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const selected = resolve(ctx.cwd, ctx.args[0] ?? ".");
    const mapDir = basename(selected) === MAP_DIR ? selected : join(selected, MAP_DIR);
    if (!(await ctx.services.storage.exists(mapDir))) {
      ctx.reporter.error(`No ${MAP_DIR}/ workspace found at ${mapDir}. Run 'map init' first.`);
      return FAILED;
    }

    const configPath = join(mapDir, CONFIG_FILE);
    const config = await loadOptimizerConfig(ctx, configPath);
    if (config === undefined) return FAILED;

    const budget = parseBudget(ctx.flags["budget"], config.budget ?? DEFAULT_BUDGET);
    if (budget === undefined) {
      ctx.reporter.error("--budget must be a positive integer.");
      return FAILED;
    }

    const report = await analyzeTokenUsage(ctx.services.storage, mapDir, {
      budget,
      include: config.include ?? DEFAULT_INCLUDE,
      exclude: config.exclude ?? DEFAULT_EXCLUDE,
    });

    if (ctx.flags["json"] === true) {
      ctx.reporter.info(JSON.stringify(report, null, 2));
    } else {
      reportHuman(report, ctx);
    }

    if (ctx.flags["save"] === true) {
      const reportDir = join(mapDir, "reports");
      const reportPath = join(reportDir, "token-optimization.json");
      await ctx.services.storage.ensureDir(reportDir);
      await ctx.services.storage.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
        overwrite: true,
      });
      ctx.reporter.success(`Report saved to ${reportPath}`);
    }

    return ctx.flags["check"] === true && report.overBudget ? FAILED : OK;
  },
};

async function loadOptimizerConfig(
  ctx: CommandContext,
  configPath: string,
): Promise<TokenOptimizerConfig | undefined> {
  if (!(await ctx.services.storage.exists(configPath))) return {};
  try {
    return parseConfig(await ctx.services.storage.readFile(configPath)).tools?.tokenOptimizer ?? {};
  } catch (error) {
    ctx.reporter.error(
      `Cannot read ${CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function parseBudget(flag: string | boolean | undefined, fallback: number): number | undefined {
  const value = flag === undefined ? fallback : Number(flag);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function reportHuman(
  report: Awaited<ReturnType<typeof analyzeTokenUsage>>,
  ctx: CommandContext,
): void {
  const percent = Math.round(report.utilization * 100);
  const summary =
    `Estimated context: ${format(report.estimatedTokens)} / ${format(report.budget)} tokens ` +
    `(${percent}%).`;
  if (report.overBudget) ctx.reporter.warn(summary);
  else ctx.reporter.success(summary);

  if (report.files.length === 0) {
    ctx.reporter.info("No Markdown context files matched the configured globs.");
    return;
  }

  ctx.reporter.info("Largest context files:");
  for (const file of report.files.slice(0, 5)) {
    ctx.reporter.info(`  ${format(file.estimatedTokens)} tokens  ${file.path}`);
  }

  if (report.duplicates.length > 0) {
    ctx.reporter.info(
      `Potential duplicate savings: ~${format(report.potentialSavings)} tokens ` +
        `across ${report.duplicates.length} repeated block(s).`,
    );
    for (const duplicate of report.duplicates.slice(0, 3)) {
      ctx.reporter.info(
        `  ~${format(duplicate.potentialSavings)} tokens  ${duplicate.occurrences}×  ` +
          `${duplicate.files.join(", ")}`,
      );
    }
  } else {
    ctx.reporter.info("No substantial duplicated context blocks found.");
  }

  if (report.overBudget) {
    ctx.reporter.info(
      `Reduce or retarget the largest files, or raise tools.tokenOptimizer.budget in ` +
        `${join(dirname(report.workspace), MAP_DIR, CONFIG_FILE)}.`,
    );
  }
}

function format(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
