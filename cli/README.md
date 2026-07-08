# The MAP CLI has moved

The CLI now lives in its own repository, with the git history preserved:

**https://github.com/missing-ai-patterns/cli**

```bash
npm install -g @missing-ai-patterns/cli
map init
```

Why: this repository is the canonical **pattern catalog** (patterns, docs,
specifications); tools consume its published
[registry artifact](../docs/specs/registry.md) instead of living next to the
Markdown. The `map-score` package moved with it (`packages/score`); the MAP
Score **specification** stayed here at
[`docs/specs/map-score.md`](../docs/specs/map-score.md).

Issues and PRs about the CLI belong in the new repository. This note will be
removed a release after the move.
