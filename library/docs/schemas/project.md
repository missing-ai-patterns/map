# MAP project manifest

`.map/map.config.json` identifies a MAP project and configures analysis, registry,
context compilation, packs, and project tools. It is read by `map init`, `map doctor`,
editors, CI, and agents.

Machine contract: [`project.schema.json`](../../schemas/project.schema.json).

## Version fields

- `version` is the on-disk configuration revision understood and migrated by the CLI.
  The current revision is `3`; revision `2` stays valid.
- `specVersion` identifies the MAP Standard contract. It is optional for existing v2
  and v3 workspaces. New workspaces write `"0.1"` while the standard is pre-1.0.

Changing `version` can require `map init --yes` migration. A compatible addition to
the standard changes `specVersion` without silently rewriting user configuration.

## Top-level fields

| Field | Required | Meaning |
|---|---:|---|
| `version` | yes | CLI configuration revision. |
| `specVersion` | no | MAP Standard version; generated for new workspaces. |
| `project` | yes | Name, creation time, and detected languages. |
| `analysis` | yes | Analyzer IDs plus project-relative include/exclude globs. |
| `registry` | yes | `default`, a URL, or a local registry source. |
| `packs` | no | Unique namespaced pack requirements and optional version ranges. |
| `tools` | no | Project tool settings, currently the token optimizer. |
| `sources` | no | Markdown globs loaded from `.map/`; defaults to `**/*.md`. |
| `targets` | no | Adapter/output mapping for generated agent context. |
| `x-*` | no | Experimental project metadata. |

Paths and globs are project-relative. Absolute paths and `..` traversal are rejected.
Unknown stable fields fail validation; prefix experiments with `x-`.

## Minimal example

```json
{
  "version": 3,
  "specVersion": "0.1",
  "project": {
    "name": "example",
    "createdAt": "2026-09-13T08:00:00.000Z",
    "languages": []
  },
  "analysis": { "analyzers": [], "include": [], "exclude": [] },
  "registry": { "source": "default" }
}
```

## Full example

See [`fixtures/project/valid/full.json`](../../schemas/fixtures/project/valid/full.json).
It shows scoped analysis, a pack requirement, token budgeting, source selection, and
multiple generated targets.

## Compatibility and rollback

The schema accepts existing v2/v3 manifests without `specVersion`, `packs`, `sources`,
or `targets`. New fields are additive. Older CLI releases ignore `specVersion` and
`packs`; pack resolution is intentionally a later capability. To roll back, remove
those optional fields. The CLI never rewrites an existing manifest without the
explicit `--force` path already used by `map init`.
