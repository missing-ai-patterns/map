import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/cli/runner.ts";
import { capture } from "./helpers.ts";

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "map-add-"));
}

describe("map add", () => {
  it("copies a published pattern's files into the workspace", async () => {
    const dir = await tempProject();
    try {
      await runCli(["init"], { cwd: dir, reporter: capture() });

      const reporter = capture();
      const code = await runCli(["add", "retrieval/chunking"], { cwd: dir, reporter });
      expect(code).toBe(0);

      const base = join(dir, ".map/patterns/retrieval/chunking");
      expect((await readFile(join(base, "prompt.md"), "utf8")).length).toBeGreaterThan(100);
      expect((await stat(join(base, "acceptance.md"))).isFile()).toBe(true);

      const metadata = JSON.parse(await readFile(join(base, "pattern.json"), "utf8"));
      expect(metadata.id).toBe("retrieval/chunking");
      expect(metadata.files).toBeUndefined();

      // Second add without --force keeps files and reports skips.
      const again = capture();
      await runCli(["add", "retrieval/chunking"], { cwd: dir, reporter: again });
      expect(again.lines.join("\n")).toContain("skipped");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("requires a workspace and a published pattern", async () => {
    const dir = await tempProject();
    try {
      const noWorkspace = capture();
      expect(await runCli(["add", "retrieval/chunking"], { cwd: dir, reporter: noWorkspace })).toBe(1);
      expect(noWorkspace.lines.join("\n")).toContain("map init");

      await runCli(["init"], { cwd: dir, reporter: capture() });

      const planned = capture();
      expect(await runCli(["add", "retrieval/semantic-cache"], { cwd: dir, reporter: planned })).toBe(1);
      expect(planned.lines.join("\n")).toContain("not published");

      const unknown = capture();
      expect(await runCli(["add", "retrieval/nope-cache"], { cwd: dir, reporter: unknown })).toBe(1);
      expect(unknown.lines.join("\n")).toContain("Unknown pattern id");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("map explain", () => {
  it("renders a published pattern with guidance and score", async () => {
    const reporter = capture();
    const code = await runCli(["explain", "retrieval/chunking"], { reporter });
    expect(code).toBe(0);

    const output = reporter.lines.join("\n");
    expect(output).toContain("Chunking");
    expect(output).toContain("When to use:");
    expect(output).toContain("When NOT to use:");
    expect(output).toContain("MAP Score:");
    expect(output).toContain("map add retrieval/chunking");
  });

  it("explains roadmap-only entries and lists ambiguous matches", async () => {
    const roadmapOnly = capture();
    expect(await runCli(["explain", "retrieval/semantic-cache"], { reporter: roadmapOnly })).toBe(0);
    expect(roadmapOnly.lines.join("\n")).toContain("Not written yet");

    const ambiguous = capture();
    expect(await runCli(["explain", "memory"], { reporter: ambiguous })).toBe(1);
    expect(ambiguous.lines.join("\n")).toContain("matches");

    const none = capture();
    expect(await runCli(["explain", "zzz-does-not-exist"], { reporter: none })).toBe(1);
    expect(none.lines.join("\n")).toContain("No pattern matches");
  });
});
