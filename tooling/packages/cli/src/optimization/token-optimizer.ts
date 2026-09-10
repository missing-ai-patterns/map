/**
 * Token-budget analysis for a MAP workspace.
 *
 * The estimate deliberately stays provider-neutral: roughly four characters per
 * token is accurate enough for budget and regression checks without coupling MAP
 * to one tokenizer or model vendor.
 */

import { join, sep } from "node:path";
import type { Storage } from "../storage/index.ts";
import { globToRegExp } from "../compiler/loader.ts";

export interface TokenOptimizerOptions {
  readonly budget: number;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

export interface FileTokenUsage {
  readonly path: string;
  readonly characters: number;
  readonly estimatedTokens: number;
}

export interface DuplicateBlock {
  readonly preview: string;
  readonly files: readonly string[];
  readonly occurrences: number;
  readonly estimatedTokens: number;
  readonly potentialSavings: number;
}

export interface TokenOptimizationReport {
  readonly generatedAt: string;
  readonly workspace: string;
  readonly budget: number;
  readonly estimatedTokens: number;
  readonly utilization: number;
  readonly overBudget: boolean;
  readonly potentialSavings: number;
  readonly files: readonly FileTokenUsage[];
  readonly duplicates: readonly DuplicateBlock[];
}

export async function analyzeTokenUsage(
  storage: Storage,
  mapDir: string,
  options: TokenOptimizerOptions,
): Promise<TokenOptimizationReport> {
  const includes = options.include.map(globToRegExp);
  const excludes = options.exclude.map(globToRegExp);
  const paths = (await storage.listFiles(mapDir))
    .map(toPosix)
    .filter((path) => path.endsWith(".md"))
    .filter((path) => includes.some((matcher) => matcher.test(path)))
    .filter((path) => !excludes.some((matcher) => matcher.test(path)));

  const files: FileTokenUsage[] = [];
  const blocks = new Map<string, { text: string; files: string[] }>();

  for (const path of paths) {
    const contents = await storage.readFile(join(mapDir, ...path.split("/")));
    files.push({
      path,
      characters: contents.length,
      estimatedTokens: estimateTokens(contents),
    });

    for (const block of meaningfulBlocks(contents)) {
      const current = blocks.get(block.key) ?? { text: block.text, files: [] };
      current.files.push(path);
      blocks.set(block.key, current);
    }
  }

  files.sort((a, b) => b.estimatedTokens - a.estimatedTokens || a.path.localeCompare(b.path));
  const duplicates = [...blocks.values()]
    .filter((block) => block.files.length > 1)
    .map((block): DuplicateBlock => {
      const tokens = estimateTokens(block.text);
      return {
        preview: preview(block.text),
        files: [...new Set(block.files)],
        occurrences: block.files.length,
        estimatedTokens: tokens,
        potentialSavings: tokens * (block.files.length - 1),
      };
    })
    .sort((a, b) => b.potentialSavings - a.potentialSavings);

  const estimatedTokens = files.reduce((sum, file) => sum + file.estimatedTokens, 0);
  const potentialSavings = duplicates.reduce((sum, block) => sum + block.potentialSavings, 0);
  return {
    generatedAt: new Date().toISOString(),
    workspace: mapDir,
    budget: options.budget,
    estimatedTokens,
    utilization: options.budget === 0 ? 0 : estimatedTokens / options.budget,
    overBudget: estimatedTokens > options.budget,
    potentialSavings,
    files,
    duplicates,
  };
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function meaningfulBlocks(contents: string): readonly { key: string; text: string }[] {
  return contents
    .split(/\n\s*\n/)
    .map((text) => text.trim().replace(/\s+/g, " "))
    .filter((text) => text.length >= 120)
    .map((text) => ({ key: text.toLocaleLowerCase(), text }));
}

function preview(text: string): string {
  // Duplicate candidates are at least 120 characters, so every preview is truncated.
  return `${text.slice(0, 97)}...`;
}

function toPosix(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}
