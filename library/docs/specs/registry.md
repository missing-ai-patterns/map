# MAP Registry Specification (v1)

| | |
|---|---|
| **Status** | Implemented |
| **Owner** | @rajanbor |

The **registry** is the machine-readable form of the MAP catalog: one JSON artifact,
`registry.json`, compiled from this repository's content and published with every
release. Tools — the [MAP CLI](https://github.com/rajanbor/map/tree/main/tooling), the future
website, AI agents — consume the registry, never the Markdown directly. The Markdown
stays the human source of truth; the registry is its build output.

## Where it comes from

`scripts/build-registry.ts` merges two sources:

1. **`ROADMAP.md`** — the target catalog. Every listed pattern becomes an entry with
   its status (`planned`, `in-progress`, `published`).
2. **`patterns/<category>/<slug>/pattern.yaml`** — written patterns. These override
   the roadmap entry and contribute summary, maturity, MAP Score, guidance lists,
   cross-references, and embedded files. An entry found on disk is always `published`.

Build and validate locally:

```bash
node scripts/build-registry.ts            # writes dist/registry.json
node scripts/build-registry.ts --check    # validate only (what CI runs)
```

The build **fails** on: a roadmap that yields no entries, a `pattern.yaml` whose
`category` disagrees with its directory, an incomplete or out-of-range MAP Score, or a
`related:` id that doesn't resolve in the catalog. CI runs `--check` on every PR, so
content errors are caught at review time instead of inside a consumer.

## Where it is published

Every release attaches `registry.json` to the GitHub Release. Consumers should use the
stable latest-release URL:

```
https://github.com/rajanbor/map/releases/latest/download/registry.json
```

or pin a version:

```
https://github.com/rajanbor/map/releases/download/v0.4.0/registry.json
```

## Format

```jsonc
{
  "schemaVersion": 1,              // integer; bumped only on breaking changes
  "generatedAt": "2026-07-07T12:00:00.000Z",
  "source": {
    "repository": "https://github.com/rajanbor/map",
    "version": "0.4.0"             // the repo VERSION the registry was built from
  },
  "categories": ["retrieval", "memory", "agents", "security", "context",
                 "evaluation", "performance", "routing", "tool-calling",
                 "observability"],
  "patterns": [
    {
      // Always present
      "id": "retrieval/chunking",  // canonical id: <category>/<slug>
      "name": "Chunking",
      "category": "retrieval",
      "status": "published",       // "published" | "in-progress" | "planned"

      // Present when the pattern is written (from pattern.yaml)
      "summary": "Split documents into smaller, self-contained units …",
      "maturity": "established",
      "alsoKnownAs": ["Text splitting", "Document segmentation"],
      "score": {                   // MAP Score, 1..5 each (docs/specs/map-score.md)
        "complexity": 2,
        "latency": 5,
        "cost": 5,
        "accuracyImpact": 5,
        "productionReadiness": 5
      },
      "whenToUse": ["…"],
      "whenNotToUse": ["…"],
      "related": ["retrieval/reranking", "…"],   // ids, always resolvable
      "references": ["https://arxiv.org/abs/2005.11401"],

      // Embedded pattern files, so tools can scaffold offline (`map add`)
      "files": {
        "prompt.md": "…full contents…",
        "acceptance.md": "…full contents…"
      }
    }
  ]
}
```

## Compatibility rules

- **Within `schemaVersion: 1`, changes are additive only.** New optional fields may
  appear on entries; consumers must ignore fields they don't know.
- Field removals, renames, or meaning changes bump `schemaVersion`.
- `id` values are stable. Renaming a pattern id is a breaking content change and goes
  through a deprecation note in the release.
- `files` currently embeds `prompt.md` and `acceptance.md` verbatim. If the catalog
  grows enough that embedding bloats the artifact, v2 may switch to per-file URLs —
  that is a schema bump, not a silent change.

## Consumers

| Consumer | How |
|----------|-----|
| MAP CLI | Ships a snapshot of `registry.json` bundled at build time; `map update` refreshes from the latest-release URL; `MAP_REGISTRY` (path or URL) overrides both — which is also how you develop against a local map checkout (`MAP_REGISTRY=…/map/dist/registry.json`). |
| Website (future) | Reads the registry at build time to render the catalog. |
| Agents / scripts | Fetch the URL above; `map patterns --json` is a convenience view of the same data. |
