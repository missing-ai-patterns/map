<p align="center">
  <strong>MAP CLI</strong> — the command line for <a href="https://github.com/missing-ai-patterns/map">Missing AI Patterns</a>
</p>

# missing-ai-patterns/cli

The `map` command and its shared libraries. The pattern catalog itself — the
patterns, docs, and specifications — lives in the canonical
[**map** repository](https://github.com/missing-ai-patterns/map); this repository
consumes its published **registry** artifact.

```bash
npm install -g @missing-ai-patterns/cli

map init        # create the .map/ workspace in your project
map analyze     # detect your AI architecture
map recommend   # find the patterns you're missing
map explain retrieval/chunking
map add retrieval/chunking
```

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| [`@missing-ai-patterns/cli`](packages/cli/) | `packages/cli` | The `map` command. |
| [`@missing-ai-patterns/score`](packages/score/) | `packages/score` | MAP Score schema, validation, and rendering (shared by the CLI, the registry builder, and the future website). |

## How data flows

```
map repo (patterns, ROADMAP)
   └── scripts/build-registry.ts → registry.json  (published on each map release)
         └── consumed here: bundled snapshot + `map update` cache
```

The CLI never parses the map repository's Markdown — it reads `registry.json`
(see the [registry spec](https://github.com/missing-ai-patterns/map/blob/main/docs/specs/registry.md)).
Everything except `map update` works offline.

## Develop

Node >= 22 (dev runs TypeScript directly; the published packages target Node >= 20)
and pnpm.

```bash
pnpm install
pnpm build            # builds score, then cli (topological)
pnpm typecheck
pnpm test
pnpm lint
pnpm map -- --help    # run the CLI from source
```

Developing against a local map checkout:

```bash
MAP_REGISTRY=path/to/map/dist/registry.json pnpm map -- patterns
MAP_REPO=path/to/map pnpm --filter @missing-ai-patterns/cli sync-snapshot
```

## Releasing

1. Bump versions in `packages/*/package.json`.
2. Refresh the bundled registry: `pnpm --filter @missing-ai-patterns/cli sync-snapshot`.
3. Tag `v<version>` — the release workflow builds and publishes both packages to npm.

## Contributing

Issues and PRs about the **CLI, score library, or tooling** belong here; new
patterns and documentation belong in
[missing-ai-patterns/map](https://github.com/missing-ai-patterns/map). The
[vision document](docs/vision.md) describes where the CLI is heading.

## License

[MIT](LICENSE).
