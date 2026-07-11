# Chunking — TypeScript reference

Minimal, dependency-free implementation of the
[Chunking pattern](../../../../patterns/retrieval/chunking/) — the TypeScript port of
the [Python reference](../../../python/retrieval/chunking/).

## What it shows

- `fixedSizeChunks` — fixed character windows with overlap (simplest baseline).
- `recursiveChunks` — prefer natural boundaries (paragraph → line → word), hard-cut
  only as a last resort (a better default).
- `chunkWithMetadata` — what you'd actually index: chunk text plus source/position.

## Run

```bash
node example.ts             # demo (Node 22.6+ — native type stripping, no build step)
node --test example.test.ts # tests (node:test + node:assert, no dependencies)
```

No dependencies, no `package.json`, no build step — same Node-native TypeScript the
repo's registry builder uses. This is a teaching aid, not a production splitter — for
real use, size by tokens and consider structure-aware or semantic strategies (see the
pattern's Production Variants).
