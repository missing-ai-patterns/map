#!/usr/bin/env node
/**
 * Executable entry point for the published `map` CLI (built to dist/map.js).
 */

import { runCli } from "./cli/runner.ts";

process.exitCode = await runCli(process.argv.slice(2));
