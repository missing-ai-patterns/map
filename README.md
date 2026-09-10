# MAP — your AI engineering library

MAP is a project toolkit for building AI systems with a repeatable structure.
Initialize it inside an application, keep architecture knowledge in `.map/`, and
use the CLI to analyze the codebase, adopt proven patterns, compile instructions
for AI coding assistants, and keep context within a token budget.

```bash
npm install -g @missing-ai-patterns/cli
cd my-ai-project
map init
map analyze
map recommend
map optimize --save
map sync
```

`map init` creates a concrete, versioned workspace:

```text
.map/
├── map.config.json     project, analyzers, context targets, and tool settings
├── architecture/      system boundaries, data flow, and diagrams
├── decisions/         AI architecture decision records
├── patterns/          patterns adopted with `map add`
├── prompts/           reusable project prompts
├── agents/            agent roles and guardrails
├── evals/             datasets, rubrics, and evaluation configuration
├── tools/             project-level tool guidance and budgets
├── reports/           generated analysis and token reports (gitignored)
└── cache/             local registry/tool caches (gitignored)
```

## Repository map

| Area | Purpose |
| --- | --- |
| [`library/`](library/) | The pattern library, specifications, examples, and reference implementations |
| [`tooling/`](tooling/) | The MAP CLI and reusable TypeScript packages |
| [`apps/website/`](apps/website/) | The public registry-driven website |
| [`docs/`](docs/) | Product model, project structure, and getting-started guides |
| [`.map/`](.map/) | MAP's own project workspace — MAP uses the structure it generates |

## Core workflow

1. `map init` detects the project and creates `.map/` without overwriting user files.
2. `map analyze` identifies AI-related technologies and architecture signals.
3. `map recommend` suggests missing production patterns.
4. `map add <pattern-id>` adopts a pattern into the project workspace.
5. `map optimize` estimates context usage, flags repeated content, and enforces a token budget.
6. `map sync` compiles the same source of truth into `CLAUDE.md`, `AGENTS.md`,
   `GEMINI.md`, Cursor rules, and Copilot instructions.

Start with [Getting started](docs/getting-started.md), review the
[project structure](docs/project-structure.md), or browse the
[pattern catalog](library/README.md).

The original MAP repositories were consolidated here with their Git histories,
branches, tags, and releases preserved.

