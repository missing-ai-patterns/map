/**
 * Tests for the Chunking reference (node:test, no dependencies).
 *
 * Run:  node --test          (from this directory; Node 22.6+)
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { chunkWithMetadata, fixedSizeChunks, recursiveChunks } from "./example.ts";

test("fixedSizeChunks: windows overlap by the configured amount", () => {
  const chunks = fixedSizeChunks("abcdefghij", 4, 2);
  assert.deepEqual(chunks, ["abcd", "cdef", "efgh", "ghij", "ij"]);
});

test("fixedSizeChunks: rejects invalid size/overlap combinations", () => {
  assert.throws(() => fixedSizeChunks("text", 0, 0), RangeError);
  assert.throws(() => fixedSizeChunks("text", 4, 4), RangeError);
  assert.throws(() => fixedSizeChunks("text", 4, -1), RangeError);
});

test("fixedSizeChunks: skips whitespace-only windows", () => {
  const chunks = fixedSizeChunks("ab      cd", 4, 0);
  assert.ok(chunks.every((chunk) => chunk.trim() !== ""));
});

test("recursiveChunks: short text returns as a single chunk", () => {
  assert.deepEqual(recursiveChunks("short text", 800), ["short text"]);
  assert.deepEqual(recursiveChunks("   ", 800), []);
});

test("recursiveChunks: prefers paragraph boundaries over hard cuts", () => {
  const text = "first paragraph here\n\nsecond paragraph here";
  const chunks = recursiveChunks(text, 25);
  assert.deepEqual(chunks, ["first paragraph here", "second paragraph here"]);
});

test("recursiveChunks: falls through separators for oversized pieces", () => {
  const oneLongLine = "word ".repeat(50).trim(); // no \n\n or \n, only spaces
  const chunks = recursiveChunks(oneLongLine, 30);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 30));
});

test("recursiveChunks: hard-cuts only when no separator is left", () => {
  const unbroken = "x".repeat(100);
  const chunks = recursiveChunks(unbroken, 30);
  assert.ok(chunks.every((chunk) => chunk.length <= 30));
  assert.equal(chunks.join(""), unbroken); // nothing lost
});

test("recursiveChunks: every chunk respects the size limit", () => {
  const document = "para one is here\n\npara two is quite a bit longer than one\nline three";
  for (const chunk of recursiveChunks(document, 20)) {
    assert.ok(chunk.length <= 20, `chunk too long: ${JSON.stringify(chunk)}`);
  }
});

test("chunkWithMetadata: attaches source, index, and copied metadata", () => {
  const chunks = chunkWithMetadata("a\n\nb", "doc.md", 1, { lang: "en" });
  assert.equal(chunks.length, 2);
  assert.deepEqual(
    chunks.map((chunk) => chunk.index),
    [0, 1],
  );
  assert.ok(chunks.every((chunk) => chunk.source === "doc.md"));
  chunks[0]!.metadata["lang"] = "de"; // per-chunk copies stay independent
  assert.equal(chunks[1]!.metadata["lang"], "en");
});
