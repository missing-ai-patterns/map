/**
 * `map watch` — regenerate outputs whenever anything under `.map/` changes.
 *
 * A thin loop around `map sync`: it does an initial compile, then watches the `.map/`
 * tree and re-runs the sync on every change (debounced). Runs until interrupted
 * (Ctrl-C). The actual compilation lives in the sync command, so watch stays a
 * scheduler and nothing more.
 */

import { join } from "node:path";
import { watch } from "node:fs";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import { MAP_DIR } from "../../config/index.ts";
import { syncCommand } from "./sync.ts";

const DEBOUNCE_MS = 120;

export const watchCommand: Command = {
  name: "watch",
  summary: "Watch .map/ and regenerate the AI context files on every change.",
  usage: "map watch",

  async run(ctx: CommandContext): Promise<CommandResult> {
    const mapDir = join(ctx.cwd, MAP_DIR);
    if (!(await ctx.services.storage.exists(mapDir))) {
      ctx.reporter.error(`no ${MAP_DIR}/ workspace in ${ctx.cwd}`);
      ctx.reporter.info("Run 'map init' first.");
      return FAILED;
    }

    // Initial compile so the outputs are current before we start watching.
    await syncCommand.run(ctx);
    ctx.reporter.info(`Watching ${MAP_DIR}/ for changes… (Ctrl-C to stop)`);

    await new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let running = false;

      const trigger = (): void => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
          if (running) return;
          running = true;
          void syncCommand
            .run(ctx)
            .catch((error: unknown) => {
              ctx.reporter.error(error instanceof Error ? error.message : String(error));
            })
            .finally(() => {
              running = false;
            });
      }, DEBOUNCE_MS);
      };

      const watcher = watch(mapDir, { recursive: true }, () => {
        ctx.reporter.info("change detected — recompiling…");
        trigger();
      });
      const stop = (): void => {
        watcher.close();
        resolve();
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });

    return OK;
  },
};
