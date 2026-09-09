import { describe, it, expect } from "vitest";
import { renderTemplateDir } from "../src/scaffold/index.ts";
import { fakeStorage } from "./helpers.ts";

describe("renderTemplateDir", () => {
  const template = {
    "/tpl/map.config.json": '{ "name": {{projectName}} }\n',
    "/tpl/_gitignore": "cache/\n",
    "/tpl/patterns/README.md": "# Patterns\n",
  };

  it("copies the tree, interpolating variables and mapping _dotfiles", async () => {
    const storage = fakeStorage({ ...template });
    const rendered = await renderTemplateDir(storage, "/tpl", "/dest", {
      projectName: '"demo"',
    });

    expect(rendered.map((f) => f.path).sort()).toEqual([
      ".gitignore",
      "map.config.json",
      "patterns/README.md",
    ]);
    expect(storage.files["/dest/map.config.json"]).toBe('{ "name": "demo" }\n');
    expect(storage.files["/dest/.gitignore"]).toBe("cache/\n");
  });

  it("respects overwrite semantics", async () => {
    const storage = fakeStorage({
      ...template,
      "/dest/map.config.json": "existing",
    });

    const kept = await renderTemplateDir(storage, "/tpl", "/dest", { projectName: '""' });
    expect(kept.find((f) => f.path === "map.config.json")?.written).toBe(false);
    expect(storage.files["/dest/map.config.json"]).toBe("existing");

    await renderTemplateDir(storage, "/tpl", "/dest", { projectName: '""' }, { overwrite: true });
    expect(storage.files["/dest/map.config.json"]).toContain('"name"');
  });

  it("fails loudly on unknown variables and missing templates", async () => {
    await expect(
      renderTemplateDir(fakeStorage({ ...template }), "/tpl", "/dest", {}),
    ).rejects.toThrow(/unknown variable \{\{projectName\}\}/);
    await expect(
      renderTemplateDir(fakeStorage(), "/none", "/dest", {}),
    ).rejects.toThrow(/template directory is empty/);
  });
});
