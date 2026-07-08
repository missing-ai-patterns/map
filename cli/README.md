# MAP CLI

The `map` command: initialize an AI-architecture workspace in your project,
analyze the codebase, and adopt [Missing AI Patterns](https://github.com/missing-ai-patterns/map).

The CLI consumes the MAP **registry** — the machine-readable catalog published by
the map repository — never the repository's Markdown directly. A snapshot is
bundled with the package, so everything except `map update` works offline.

## Install

```bash
npm install -g @missing-ai-patterns/cli   # or pnpm add -g / npx
map --help
```

Requires Node >= 20.

## Commands

| Command | What it does |
|---------|--------------|
| `map init` | Create the `.map/` workspace (template-based, self-configured from your project). |
| `map add <pattern-id>` | Adopt a pattern: copy its `prompt.md`, `acceptance.md`, and metadata into `.map/patterns/`. |
| `map explain <pattern-id>` | The decision-first view: summary, when (not) to use, MAP Score, related patterns. |
| `map analyze [path]` | Detect AI architecture concepts from dependency manifests (npm, PyPI, Go, Cargo). |
| `map recommend [path]` | Rule-based gaps: which patterns the detected architecture is missing, and why. |
| `map patterns [text]` | Browse/search the catalog (`--category`, `--status`, `--json`). |
| `map doctor` | Health checks: environment, workspace, registry, rule-table consistency. Non-zero on problems. |
| `map update` | Download the latest registry into `~/.map/registry.json`. |
| `map graph`, `map diff` | Scaffolded stubs for future modules. |

The core loop on a Python RAG project:

```
$ map analyze .
  Detected 3 concept(s):
    LLM Usage (90%) — requirements.txt: openai
    Vector Search (90%) — requirements.txt: chromadb
    RAG (60%) — requirements.txt: langchain

$ map recommend .
  [high] security/prompt-injection-defense (triggered by: rag, vector_search)
  [medium] evaluation/golden-dataset (triggered by: llm, vector_search, rag)
  ...

$ map add retrieval/chunking
  created .map/patterns/retrieval/chunking/prompt.md
  created .map/patterns/retrieval/chunking/acceptance.md
```

## What `map init` creates

```
.map/
  map.config.json     # how MAP sees this project (editable; schema v2)
  patterns/           # patterns adopted via `map add`
  prompts/            # your project's prompt library
  architecture/       # architecture notes and diagrams
  decisions/          # ADRs for AI architecture choices
  evals/              # golden datasets, judge prompts, eval configs
  agents/             # agent definitions and guardrails
  reports/            # `map analyze` output (gitignored)
  cache/              # local caches (gitignored)
```

The workspace is rendered from [`templates/workspace/`](templates/workspace/) —
its layout is data, not code. Existing files are never overwritten without
`--force` (or an interactive confirmation). A legacy v1 workspace
(`config.yaml` + `project.yaml`) is migrated by `map init --yes`.

## Where pattern data comes from

Resolution order (see `src/knowledge/registry-source.ts`):

1. `MAP_REGISTRY=<path>` — explicit override; also how you develop against a
   local map checkout (`MAP_REGISTRY=…/map/dist/registry.json`).
2. `~/.map/registry.json` — the user cache written by `map update`.
3. `registry-snapshot/registry.json` — bundled with the package at build time.

`map update` downloads from the map repository's latest release
(`MAP_REGISTRY=<url>` or `--registry <url>` overrides the URL).

## Architecture

Clean architecture with one-way dependencies: commands depend on core modules
through interfaces; the domain depends on nothing.

```
bin/map.ts                 dev entry (Node >= 22 runs TS directly)
src/
  bin.ts                   published entry (built to dist/map.js)
  domain/                  pure types: patterns, catalog, concepts, analysis. No I/O.
  knowledge/               Module 1 — registry parsing, source resolution, catalog
  graph/                   Module 4 — pattern graph (interface + in-memory impl)
  analyzer/                Module 2 — dependency-manifest analyzer + signal table
  recommendation/          Module 3 — rule-based recommender + rule table
  storage/                 filesystem abstraction (all file I/O goes through it)
  reporting/               output abstraction (all console output goes through it)
  config/                  map.config.json schema + parsing
  scaffold/                template rendering (used by init)
  plugins/                 extension points (register analyzers/commands)
  services.ts              composition root (wires the modules)
  cli/                     Module 5 — command system
    command.ts             Command contract (declarative args/options)
    command-registry.ts    lookup + plugin extension point
    runner.ts              Commander adapter: registry → program
    commands/              init, add, explain, analyze, recommend, patterns,
                           doctor, update (+ planned stubs)
templates/workspace/       the .map/ scaffold (data, not code)
registry-snapshot/         bundled registry (regenerated by `pnpm sync-snapshot`)
```

Design rules:

- Commands are thin, declare their surface (`args`, `options`), and never import
  Commander; the runner adapts the registry onto it.
- Nothing outside `storage/` touches the project's filesystem; nothing outside
  `reporting/` writes to the console.
- Concrete classes are created only in `services.ts` (the composition root) and tests.
- Pattern data comes from the registry — adding a pattern to MAP requires **no
  change** in this codebase.

## Develop

```bash
pnpm install
pnpm map -- --help       # run from source (Node >= 22)
pnpm typecheck
pnpm test                # vitest; test:coverage enforces the CI gate
pnpm build               # tsup → dist/
pnpm sync-snapshot       # refresh registry-snapshot/ from a local map checkout
```

## Extensibility

Plugins receive a small `PluginApi` and register analyzers or commands — see
[`src/plugins/plugin.ts`](src/plugins/plugin.ts). The intended shape includes
packages like `map-analyzer-typescript` and `map-analyzer-python`.

## What's next (TODOs)

- **Module 2:** source-code analyzers (TypeScript, Python) that detect concepts
  from imports and call sites, deepening what the manifest analyzer finds.
- **Module 3:** back the recommender with the pattern graph (prerequisites,
  conflicts) instead of the flat rule table.
- **Module 4/5:** implement `graph`, then `diff`.
- Registry: ship pattern content as per-file URLs once embedding outgrows v1.

Grep for `TODO(` to find the extension points.
