#!/usr/bin/env node
/**
 * Development entry point for the `map` CLI (runs TypeScript directly on
 * Node >= 22). The published executable is built from src/bin.ts by tsup.
 */

import { runCli } from "../src/cli/runner.ts";

process.exitCode = await runCli(process.argv.slice(2));
