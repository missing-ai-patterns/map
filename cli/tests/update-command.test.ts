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
