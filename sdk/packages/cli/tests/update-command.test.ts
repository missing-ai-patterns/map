import { describe, it, expect, vi, afterEach } from "vitest";
import { updateCommand } from "../src/cli/commands/update.ts";
import { createDefaultServices } from "../src/services.ts";
import { userRegistryCachePath } from "../src/knowledge/index.ts";
import { capture, fakeStorage, registryJson } from "./helpers.ts";

function context(storage = fakeStorage()) {
  const reporter = capture();
  const services = createDefaultServices({ storage });
  return { cwd: "/project", args: [], flags: {}, services, reporter, storage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("map update", () => {
  it("downloads, validates, and caches the registry", async () => {
    const body = registryJson([
      { id: "retrieval/chunking", name: "Chunking", category: "retrieval", status: "published" },
    ]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status: 200 })));

    const ctx = context();
    const result = await updateCommand.run({ ...ctx, flags: { registry: "https://example.com/r.json" } });

    expect(result.exitCode).toBe(0);
    expect(ctx.storage.files[userRegistryCachePath()]).toBe(body);
    expect(ctx.reporter.lines.join("\n")).toContain("Registry updated: 1 patterns");
  });

  it("reports the delta when replacing an older cached registry", async () => {
    const oldBody = JSON.stringify({
      ...JSON.parse(registryJson([{ id: "retrieval/chunking", name: "Chunking", category: "retrieval", status: "published" }])),
      source: { repository: "r", version: "0.3.1" },
    });
    const newBody = JSON.stringify({
      ...JSON.parse(
        registryJson([
          { id: "retrieval/chunking", name: "Chunking", category: "retrieval", status: "published" },
          { id: "memory/conversation-memory", name: "Conversation Memory", category: "memory", status: "published" },
        ]),
      ),
      source: { repository: "r", version: "0.5.0" },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(newBody, { status: 200 })));

    // The suite pins MAP_REGISTRY (tests/setup.ts); seed that source as "current".
    const ctx = context(fakeStorage({ [process.env["MAP_REGISTRY"]!]: oldBody }));
    const result = await updateCommand.run(ctx);

    expect(result.exitCode).toBe(0);
    const output = ctx.reporter.lines.join("\n");
    expect(output).toContain("catalog v0.3.1 → v0.5.0");
    expect(output).toContain("published 1 → 2");
    expect(ctx.storage.files[userRegistryCachePath()]).toBe(newBody);
  });

  it("--check reports availability without writing", async () => {
    const body = registryJson([
      { id: "retrieval/chunking", name: "Chunking", category: "retrieval", status: "published" },
    ]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status: 200 })));

    const fresh = context();
    const checked = await updateCommand.run({ ...fresh, flags: { check: true } });
    expect(checked.exitCode).toBe(0);
    expect(fresh.reporter.lines.join("\n")).toContain("Update available");
    expect(fresh.storage.files[userRegistryCachePath()]).toBeUndefined();

    const upToDate = context(fakeStorage({ [process.env["MAP_REGISTRY"]!]: body }));
    await updateCommand.run({ ...upToDate, flags: { check: true } });
    expect(upToDate.reporter.lines.join("\n")).toContain("Already up to date");
  });

  it("fails with a clear message when the download times out", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw timeout;
    }));

    const ctx = context();
    expect((await updateCommand.run(ctx)).exitCode).toBe(1);
    expect(ctx.reporter.lines.join("\n")).toContain("timed out after 30s");
  });

  it("fails on HTTP errors, network errors, and invalid documents", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404, statusText: "Not Found" })));
    expect((await updateCommand.run(context())).exitCode).toBe(1);

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    const offline = context();
    expect((await updateCommand.run(offline)).exitCode).toBe(1);
    expect(offline.reporter.lines.join("\n")).toContain("offline");

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const invalid = context();
    expect((await updateCommand.run(invalid)).exitCode).toBe(1);
    expect(invalid.reporter.lines.join("\n")).toContain("invalid");
    expect(invalid.storage.files[userRegistryCachePath()]).toBeUndefined();
  });
});
