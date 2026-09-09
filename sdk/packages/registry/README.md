# @missing-ai-patterns/registry

The **MAP registry contract** — one shared definition of the machine-readable
pattern catalog, so the schema can never drift between the tools that use it.

The [`patterns`](https://github.com/missing-ai-patterns/patterns) repository is the human
source of truth (Markdown). Its build step compiles that content into
`registry.json`. Every consumer — the CLI, the website, AI agents — reads the
registry, never the Markdown. This package is the registry's **types + validating
parser**, depended on by all of them (and, ideally, by the builder itself).

## API

```ts
import { parseRegistry, SUPPORTED_SCHEMA_VERSION } from "@missing-ai-patterns/registry";
import type { RegistryDocument, CatalogEntry, PatternId } from "@missing-ai-patterns/registry";

const registry: RegistryDocument = parseRegistry(await fetchRegistryJson());
//    ^ throws a human-readable error on any structural problem
```

- `RegistryDocument` — the top-level artifact (`schemaVersion`, `source`, `categories`, `patterns`).
- `CatalogEntry` — one pattern's wire shape (id, name, category, status, and — when written — summary, MAP Score, guidance, related ids, embedded files).
- `PatternId`, `PatternCategory`, `CatalogStatus`, `MapScore` — the supporting types.
- `parseRegistry(json)` / `SUPPORTED_SCHEMA_VERSION` — validation.

The registry format itself is specified in
[`docs/specs/registry.md`](https://github.com/missing-ai-patterns/patterns/blob/main/docs/specs/registry.md).
