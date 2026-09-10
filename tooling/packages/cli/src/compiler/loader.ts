/**
 * Source loader: turns the markdown under `.map/` into a `Context`.
 *
 * The compiler config lists sources as globs relative to `.map/`. The loader expands
 * them against the real files (which `storage.listFiles` already returns relative and
 * sorted), reads each once (deduped, in declared order), parses frontmatter, and
 * produces the internal context model the adapters consume.
 */

import { join, sep, basename } from "node:path";
import type { Storage } from "../storage/index.ts";
import type { Context, Document } from "./context.ts";
import { parseFrontmatter } from "./frontmatter.ts";

export async function loadContext(
  storage: Storage,
  mapDir: string,
  options: { readonly projectName: string; readonly sources: readonly string[] },
): Promise<Context> {
  const relFiles = (await storage.listFiles(mapDir))
    .map(toPosix)
    .filter((rel) => rel.endsWith(".md"));

  const seen = new Set<string>();
  const documents: Document[] = [];
  for (const source of options.sources) {
    const matcher = globToRegExp(source);
    for (const rel of relFiles) {
      if (seen.has(rel) || !matcher.test(rel)) continue;
      seen.add(rel);
      const raw = await storage.readFile(join(mapDir, ...rel.split("/")));
      documents.push(toDocument(rel, raw));
    }
  }

  return { project: { name: options.projectName }, documents };
}

function toDocument(rel: string, raw: string): Document {
  const { frontmatter, body } = parseFrontmatter(raw);
  return {
    path: rel,
    title: deriveTitle(rel, body),
    body,
    targets: frontmatter.targets,
    priority: frontmatter.priority,
  };
}

function deriveTitle(rel: string, body: string): string {
  const heading = /^#\s+(.+)$/m.exec(body);
  if (heading) return heading[1]!.trim();
  const name = basename(rel).replace(/\.md$/, "").replace(/[-_]/g, " ");
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert a `.map` glob (double-star for any depth, single-star, `?`) into a RegExp. */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i]!;
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        // A double-star followed by a slash matches any number of path segments.
        if (glob[i + 2] === "/") {
          re += "(?:[^/]+/)*";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (ch === "?") {
      re += "[^/]";
    } else if (".+^${}()|[]\\".includes(ch)) {
      re += `\\${ch}`;
    } else {
      re += ch;
    }
  }
  return new RegExp(`^${re}$`);
}

function toPosix(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}
