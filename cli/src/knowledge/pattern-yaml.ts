/**
 * Minimal parser for the pattern-contract YAML subset
 * (`patterns/<category>/<slug>/pattern.yaml`, see docs/pattern-contract.md).
 *
 * Like the serializer in `config/yaml.ts`, this is hand-rolled to keep the CLI
 * dependency-free. It understands exactly what the contract uses: top-level scalar
 * entries, folded strings (`key: >`), string lists (`- item`), and one-level nested
 * maps of scalars (`score:`). It is intentionally not a general-purpose YAML parser;
 * if the contract ever outgrows this subset, adopt a small dependency instead.
 */

export type PatternYamlValue =
  | string
  | number
  | boolean
  | readonly string[]
  | { readonly [key: string]: string | number | boolean };

export type PatternYamlDoc = Record<string, PatternYamlValue>;

export function parsePatternYaml(text: string): PatternYamlDoc {
  const doc: Record<string, PatternYamlValue> = {};
  const lines = text.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (isBlankOrComment(line) || indentOf(line) > 0) {
      i += 1;
      continue;
    }

    const entry = splitEntry(line);
    if (!entry) {
      i += 1;
      continue;
    }
    const [key, rest] = entry;

    if (rest === ">" || rest === ">-" || rest === "|" || rest === "|-") {
      const [value, next] = readFoldedBlock(lines, i + 1);
      doc[key] = value;
      i = next;
    } else if (rest !== "") {
      doc[key] = parseScalar(rest);
      i += 1;
    } else {
      const [value, next] = readBlock(lines, i + 1);
      doc[key] = value;
      i = next;
    }
  }
  return doc;
}

/** Reads an indented block: either a string list or a flat map of scalars. */
function readBlock(
  lines: readonly string[],
  start: number,
): [readonly string[] | Record<string, string | number | boolean>, number] {
  const list: string[] = [];
  const map: Record<string, string | number | boolean> = {};
  let isList = false;
  let isMap = false;

  let i = start;
  for (; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (isBlankOrComment(line)) continue;
    if (indentOf(line) === 0) break;

    const body = line.trim();
    if (body.startsWith("- ")) {
      isList = true;
      list.push(String(parseScalar(body.slice(2).trim())));
    } else {
      const entry = splitEntry(body);
      if (entry && entry[1] !== "") {
        isMap = true;
        const scalar = parseScalar(entry[1]);
        map[entry[0]] = scalar;
      }
    }
  }

  if (isList && isMap) {
    throw new Error("pattern.yaml block mixes list items and map entries");
  }
  return [isList ? list : map, i];
}

/** Reads a folded (`>`) block: indented lines joined into one space-separated string. */
function readFoldedBlock(
  lines: readonly string[],
  start: number,
): [string, number] {
  const parts: string[] = [];
  let i = start;
  for (; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.trim() === "") continue;
    if (indentOf(line) === 0) break;
    parts.push(line.trim());
  }
  return [parts.join(" "), i];
}

function splitEntry(line: string): [string, string] | undefined {
  const colon = line.indexOf(":");
  if (colon <= 0) return undefined;
  const key = line.slice(0, colon).trim();
  const rest = stripComment(line.slice(colon + 1)).trim();
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return undefined;
  return [key, rest];
}

function parseScalar(text: string): string | number | boolean {
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function stripComment(text: string): string {
  // Good enough for the contract: values never contain a literal " #".
  const hash = text.indexOf(" #");
  return hash === -1 ? text : text.slice(0, hash);
}

function isBlankOrComment(line: string): boolean {
  const t = line.trim();
  return t === "" || t.startsWith("#");
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}
