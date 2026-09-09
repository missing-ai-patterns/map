# Changelog

All notable changes to the MAP CLI workspace are documented here. The packages are
versioned in lockstep.

## 0.5.1

### Added — the MAP context compiler (`.map` as the single source of truth)
- `map sync` — compile the markdown under `.map/` into every AI assistant's context
  file: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules/map.mdc`, and
  `.github/copilot-instructions.md`. Generated files carry a "do not edit" banner.
- `map watch` — regenerate those outputs on every change under `.map/` (debounced).
- `map.config.json` gains `sources`/`targets` (schema v3, backward compatible: a v2
  config still parses and the compiler falls back to sensible defaults).
- Per-document selection via frontmatter (`targets`, `priority`).
- `map doctor` gains compiler checks: unsupported targets, sources matching nothing,
  duplicate sections, and broken references.

### Changed — the shared registry contract
- New package **`@missing-ai-patterns/registry`**: the single, canonical definition of
  the registry schema (types + `parseRegistry`), so the CLI, the website, and the
  registry builder can share one contract instead of three copies.
- The CLI re-exports the registry types from that package; no import paths changed.
- The registry download URL is now overridable via `MAP_REGISTRY_URL`, decoupling the
  published location from the content repository.

### Packages
- `@missing-ai-patterns/cli` 0.5.0 → 0.5.1
- `@missing-ai-patterns/score` 0.5.0 → 0.5.1
- `@missing-ai-patterns/registry` 0.5.1 (new)

## 0.5.0

Registry-backed catalog, resilient registry loading, `map update` (`--check`,
timeout, delta), and the v0.5.0 snapshot.
