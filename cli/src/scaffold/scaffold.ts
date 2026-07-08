/**
 * Template-based scaffolding.
 *
 * `map init` (and future generators) render a template directory into the
 * project instead of hardcoding files in command logic: adding a directory or
 * seed file to the workspace is a template change, not a code change.
 *
 * Rules:
 *  - every file in the template tree is copied, preserving relative paths;
 *  - `{{name}}` placeholders in file contents are replaced from `vars`
 *    (unknown placeholders are an error — templates and code stay in sync);
 *  - a leading `_` on a file name becomes a leading `.` (`_gitignore` →
 *    `.gitignore`), because npm excludes `.gitignore` files from packages.
 */

import { dirname, join, basename } from "node:path";
import type { Storage } from "../storage/index.ts";

export interface RenderedFile {
  /** Path relative to the destination root. */
  readonly path: string;
  /** Whether the file was written (false: existed and overwrite was off). */
  readonly written: boolean;
}

export interface ScaffoldOptions {
  readonly overwrite?: boolean;
}

export async function renderTemplateDir(
  storage: Storage,
  templateDir: string,
  destinationDir: string,
  vars: Readonly<Record<string, string>>,
  options: ScaffoldOptions = {},
): Promise<readonly RenderedFile[]> {
  const files = await storage.listFiles(templateDir);
  if (files.length === 0) {
    throw new Error(`template directory is empty or missing: ${templateDir}`);
  }

  const results: RenderedFile[] = [];
  for (const file of files) {
    const relative = join(dirname(file), targetName(basename(file))).replace(/^\.\//, "");
    const destination = join(destinationDir, relative);
    const contents = interpolate(await storage.readFile(join(templateDir, file)), vars, file);

    await storage.ensureDir(dirname(destination));
    const written = await storage.writeFile(destination, contents, {
      overwrite: options.overwrite ?? false,
    });
    results.push({ path: relative, written });
  }
  return results;
}

function targetName(name: string): string {
  return name.startsWith("_") ? `.${name.slice(1)}` : name;
}

function interpolate(
  contents: string,
  vars: Readonly<Record<string, string>>,
  file: string,
): string {
  return contents.replace(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g, (_, name: string) => {
    const value = vars[name];
    if (value === undefined) {
      throw new Error(`template ${file} references unknown variable {{${name}}}`);
    }
    return value;
  });
}
