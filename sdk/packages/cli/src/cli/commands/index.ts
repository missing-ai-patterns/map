/**
 * Registers the built-in command set. `init`, `add`, `sync`, `watch`, `explain`,
 * `analyze`, `recommend`, `patterns`, `doctor`, and `update` are implemented; the
 * rest are scaffolded placeholders for future modules.
 */

import type { CommandRegistry } from "../command-registry.ts";
import { initCommand } from "./init.ts";
import { addCommand } from "./add.ts";
import { explainCommand } from "./explain.ts";
import { analyzeCommand } from "./analyze.ts";
import { recommendCommand } from "./recommend.ts";
import { patternsCommand } from "./patterns.ts";
import { doctorCommand } from "./doctor.ts";
import { updateCommand } from "./update.ts";
import { syncCommand } from "./sync.ts";
import { watchCommand } from "./watch.ts";
import { planned } from "./planned.ts";

export function registerBuiltinCommands(registry: CommandRegistry): void {
  registry.register(initCommand);
  registry.register(addCommand);
  registry.register(syncCommand);
  registry.register(watchCommand);
  registry.register(explainCommand);
  registry.register(analyzeCommand);
  registry.register(recommendCommand);
  registry.register(patternsCommand);
  registry.register(doctorCommand);
  registry.register(updateCommand);

  registry.register(
    planned({
      name: "graph",
      summary: "Build and inspect the pattern graph.",
      module: "Module 4 — Graph",
    }),
  );
  registry.register(
    planned({
      name: "diff",
      summary: "Compare architecture between two revisions.",
      module: "Module 2 — Analyzer",
    }),
  );
}
