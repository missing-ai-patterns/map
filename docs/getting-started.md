# Getting started

MAP turns project-specific AI knowledge into a small, versioned workspace that
both people and coding agents can use.

## 1. Initialize a project

```bash
npm install -g @missing-ai-patterns/cli
cd your-project
map init
```

The initializer detects known language markers and creates `.map/`. It keeps
existing files unless `--force` is explicitly supplied.

## 2. Understand the architecture

```bash
map analyze
map recommend
map patterns retrieval
```

`analyze` detects architecture signals from project manifests. `recommend`
maps those signals to production patterns, and `patterns` lets you browse the
full library.

## 3. Adopt knowledge into the project

```bash
map add retrieval/chunking
```

The pattern's prompt, acceptance criteria, and metadata are copied into
`.map/patterns/`, where they can be adapted to the application and reviewed
with the rest of the code.

## 4. Keep context efficient

```bash
map optimize
map optimize --save
map optimize --budget 16000 --check
```

The optimizer estimates the token footprint of configured Markdown sources,
shows the largest files, identifies substantial repeated blocks, and optionally
enforces the budget in CI. The default budget and globs live under
`tools.tokenOptimizer` in `.map/map.config.json`.

## 5. Compile assistant instructions

```bash
map sync
```

MAP compiles the curated `.map/` content into the instruction formats used by
Claude, Codex/Agents, Gemini, Cursor, and GitHub Copilot. Edit `.map/`, not the
generated files.
