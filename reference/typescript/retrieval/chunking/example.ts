/**
 * Minimal, dependency-free chunking reference for the MAP Chunking pattern
 * (TypeScript port of ../../../python/retrieval/chunking/example.py).
 *
 * Two strategies:
 *   - fixedSizeChunks: fixed character windows with overlap (simplest baseline).
 *   - recursiveChunks: prefer natural boundaries (paragraphs, lines, words) and only
 *                      hard-cut when a piece is still too big (a better default).
 *
 * Plus chunkWithMetadata, which is what you'd actually index: text + position/source.
 *
 * Run:  node example.ts            (Node 22.6+ — native type stripping)
 * Test: node --test                (from this directory)
 */

export function fixedSizeChunks(text: string, size = 800, overlap = 100): string[] {
  if (size <= 0 || overlap < 0 || overlap >= size) {
    throw new RangeError("require size > 0 and 0 <= overlap < size");
  }
  const step = size - overlap;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += step) {
    const window = text.slice(i, i + size);
    if (window.trim() !== "") chunks.push(window);
  }
  return chunks;
}

export function recursiveChunks(
  text: string,
  size = 800,
  separators: readonly string[] = ["\n\n", "\n", " "],
): string[] {
  if (text.length <= size) return text.trim() !== "" ? [text] : [];

  for (let index = 0; index < separators.length; index++) {
    const sep = separators[index]!;
    if (!text.includes(sep)) continue;

    const parts: string[] = [];
    let buf = "";
    for (const piece of text.split(sep)) {
      const candidate = buf === "" ? piece : buf + sep + piece;
      if (candidate.length <= size) {
        buf = candidate;
        continue;
      }
      if (buf.trim() !== "") parts.push(buf);
      if (piece.length <= size) {
        buf = piece;
      } else {
        buf = "";
        parts.push(...recursiveChunks(piece, size, separators.slice(index + 1)));
      }
    }
    if (buf.trim() !== "") parts.push(buf);
    return parts;
  }

  // No separators left: fall back to hard windows.
  return fixedSizeChunks(text, size, 0);
}

/** What you'd actually store: chunk text plus retrieval metadata. */
export interface Chunk {
  text: string;
  index: number;
  source: string;
  metadata: Record<string, string>;
}

export function chunkWithMetadata(
  text: string,
  source: string,
  size = 800,
  metadata: Record<string, string> = {},
): Chunk[] {
  return recursiveChunks(text, size).map((piece, index) => ({
    text: piece,
    index,
    source,
    metadata: { ...metadata },
  }));
}

function demo(): void {
  const document = [
    "MAP documents architectural patterns for AI systems.",
    "Chunking splits documents into retrievable units. Too large and the " +
      "embedding is diluted; too small and a chunk loses meaning.",
    "Overlap keeps facts that straddle a boundary intact, at the cost of a " +
      "larger index.",
  ].join("\n\n");

  console.log("== recursiveChunks (size=90) ==");
  recursiveChunks(document, 90).forEach((chunk, i) =>
    console.log(`[${i}] (${chunk.length} chars) ${JSON.stringify(chunk)}`),
  );

  console.log("\n== chunkWithMetadata ==");
  for (const chunk of chunkWithMetadata(document, "intro.md", 90, { section: "overview" })) {
    console.log(
      `[${chunk.index}] source=${chunk.source} meta=${JSON.stringify(chunk.metadata)} ` +
        `:: ${JSON.stringify(chunk.text.slice(0, 40))}...`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  demo();
}
