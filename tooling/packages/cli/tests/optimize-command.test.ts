import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { runCli } from "../src/cli/runner.ts";
import { createDefaultServices } from "../src/services.ts";
import { analyzeTokenUsage, estimateTokens } from "../src/optimization/index.ts";
import { capture, fakeStorage } from "./helpers.ts";

const repeated =
  "Use retrieval only when the answer must be grounded in project documents. " +
  "Cite the selected source and keep the retrieved context smaller than the active token budget.";

describe("token optimizer", () => {
  it("estimates usage and finds duplicated blocks", async () => {
    const storage = fakeStorage({
      "/project/.map/prompts/a.md": `# A\n\n${repeated}\n`,
      "/project/.map/agents/b.md": `# B\n\n${repeated}\n`,
      "/project/.map/reports/old.md": repeated,
    });

    const report = await analyzeTokenUsage(storage, "/project/.map", {
      budget: 1_000,
      include: ["**/*.md"],
      exclude: ["reports/**"],
    });

    expect(report.files).toHaveLength(2);
    expect(report.duplicates).toHaveLength(1);
    expect(report.potentialSavings).toBe(estimateTokens(repeated));
    expect(report.overBudget).toBe(false);

    const unbudgeted = await analyzeTokenUsage(fakeStorage(), "/empty/.map", {
      budget: 0,
      include: ["**/*.md"],
      exclude: [],
    });
    expect(unbudgeted.utilization).toBe(0);
  });

  it("saves a report and can enforce the budget", async () => {
    const root = "/project";
    const storage = fakeStorage({
      [join(root, ".map/map.config.json")]: JSON.stringify({
        version: 3,
        project: { name: "demo", createdAt: "2026-01-01T00:00:00.000Z", languages: [] },
        analysis: { analyzers: [], include: [], exclude: [] },
        registry: { source: "default" },
        tools: { tokenOptimizer: { budget: 10, include: ["**/*.md"], exclude: [] } },
      }),
      [join(root, ".map/prompts/system.md")]: "A sufficiently long system prompt for the test.",
    });
    const reporter = capture();

    const code = await runCli(["optimize", "--save", "--check"], {
      cwd: root,
      services: createDefaultServices({ storage }),
      reporter,
    });

    expect(code).toBe(1);
    expect(storage.files[join(root, ".map/reports/token-optimization.json")]).toBeDefined();
    expect(reporter.lines.join("\n")).toContain("Estimated context");
  });

  it("rejects an invalid budget", async () => {
    const storage = fakeStorage({ "/project/.map/prompts/a.md": "# A" });
    const reporter = capture();
    const code = await runCli(["optimize", "--budget", "zero"], {
      cwd: "/project",
      services: createDefaultServices({ storage }),
      reporter,
    });
    expect(code).toBe(1);
    expect(reporter.lines.join("\n")).toContain("positive integer");
  });

  it("reports duplicate savings with defaults and stays green under budget", async () => {
    const storage = fakeStorage({
      "/project/.map/prompts/a.md": repeated,
      "/project/.map/agents/b.md": repeated,
    });
    const reporter = capture();

    const code = await runCli(["optimize", "--budget", "1000", "--check"], {
      cwd: "/project",
      services: createDefaultServices({ storage }),
      reporter,
    });

    expect(code).toBe(0);
    expect(reporter.lines.join("\n")).toContain("Potential duplicate savings");
  });

  it("accepts a direct .map path and emits JSON", async () => {
    const storage = fakeStorage({
      "/project/.map/map.config.json": JSON.stringify({
        version: 3,
        project: { name: "demo", createdAt: "2026-01-01T00:00:00.000Z", languages: [] },
        analysis: { analyzers: [], include: [], exclude: [] },
        registry: { source: "default" },
      }),
      "/project/.map/prompts/a.md": "# A",
    });
    const reporter = capture();

    const code = await runCli(["optimize", ".map", "--json"], {
      cwd: "/project",
      services: createDefaultServices({ storage }),
      reporter,
    });

    expect(code).toBe(0);
    expect(JSON.parse(reporter.lines.join("\n")).estimatedTokens).toBe(1);
  });

  it("explains missing workspaces and invalid configuration", async () => {
    const missingReporter = capture();
    const missingCode = await runCli(["optimize"], {
      cwd: "/missing",
      services: createDefaultServices({ storage: fakeStorage() }),
      reporter: missingReporter,
    });
    expect(missingCode).toBe(1);
    expect(missingReporter.lines.join("\n")).toContain("Run 'map init'");

    const invalidReporter = capture();
    const invalidCode = await runCli(["optimize"], {
      cwd: "/project",
      services: createDefaultServices({
        storage: fakeStorage({ "/project/.map/map.config.json": "[]" }),
      }),
      reporter: invalidReporter,
    });
    expect(invalidCode).toBe(1);
    expect(invalidReporter.lines.join("\n")).toContain("Cannot read map.config.json");
  });
});
