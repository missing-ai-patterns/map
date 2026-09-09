export { runCli } from "./runner.ts";
export type { RunnerDeps } from "./runner.ts";
export { CommandRegistry } from "./command-registry.ts";
export type {
  Command,
  CommandContext,
  CommandResult,
  FlagValue,
  CommandOption,
} from "./command.ts";
export { OK, FAILED } from "./command.ts";
export { registerBuiltinCommands } from "./commands/index.ts";
export { initCommand } from "./commands/init.ts";
export { addCommand } from "./commands/add.ts";
export { explainCommand } from "./commands/explain.ts";
export { updateCommand } from "./commands/update.ts";
