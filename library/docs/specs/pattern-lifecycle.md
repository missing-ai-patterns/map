# Pattern Lifecycle Specification

| | |
|---|---|
| **Status** | Draft |
| **Issue** | [#77](https://github.com/rajanbor/map/issues/77) |
| **Owner** | @rajanbor |

## Summary

Define the full lifecycle of a catalog entry — planned → claimed → published →
revised → deprecated/renamed — so status is always readable from the repo and tools,
and destructive changes (renames, removals) have a defined, consumer-safe process.
Today only the happy path (⬜ → ✅) is defined; the [registry spec](registry.md) says
renames go "through a deprecation note" but no such process exists.

## Motivation

- **Claiming is informal.** ROADMAP legend defines 🟡 "In progress" but nothing says
  who flips it, when it expires, or how it maps to issues — two people can write the
  same pattern.
- **Maturity is unmanaged.** `maturity:` values (`emerging`, `established`) exist in
  four `pattern.yaml` files with no definition of what promotes or demotes a pattern.
- **Renames are undefined.** `id` is the stable key for `related:` links, `map add`,
  and workspaces created by the CLI; renaming a directory today silently breaks all
  three.

## Design

**States** (per catalog entry; the registry `status` field is the projection):

| State | Where it shows | Rule |
|-------|----------------|------|
| Planned | ROADMAP ⬜ | Default for the target catalog. |
| Claimed | ROADMAP 🟡 + a linked "New Pattern" issue | Flipped in the PR that the issue's assignee opens; a claim without a linked open issue is invalid and may be reverted after 30 days. |
| Published | ROADMAP ✅ + pattern directory | The pattern PR merged; full contract present. |
| Deprecated | `deprecated: true` + `superseded_by:` in `pattern.yaml` | Article stays; a banner names the replacement. Registry keeps the entry with `status: deprecated`. |
| Renamed | Old id keeps a stub `pattern.yaml` with `renamed_to:` | Stub persists ≥ 2 minor releases; the registry emits both ids, the old one flagged, so `related:` links and CLI workspaces keep resolving. |

**Maturity** (orthogonal to state, defined once here):

- `emerging` — practiced, still evolving; production variants shifting.
- `established` — stable consensus; the default for well-known techniques.
- `declining` — still works, better defaults exist; candidates for deprecation.

Maturity changes are ordinary docs PRs; deprecation requires an issue plus a release
note. Removal (id disappears entirely) only happens a major version after
deprecation.

## Implementation plan

1. Encode this lifecycle in `CONTRIBUTING.md` (claiming) and the pattern template
   (deprecation keys); define `deprecated`/`superseded_by`/`renamed_to` in the
   [pattern schema](pattern-schema.md).
2. Teach `scripts/build-registry.ts` the two new projections (`deprecated`, rename
   stubs emitting both ids) with build-failing validation (e.g. `superseded_by` must
   resolve).
3. Registry consumers: CLI warns on `map add` of a deprecated/renamed id and follows
   `renamed_to`.

## Acceptance criteria

- [ ] CONTRIBUTING documents claim/expiry; ROADMAP legend links to it.
- [ ] A rename executed per this spec keeps `--check` green and old ids resolving in the registry.
- [ ] Deprecating a pattern requires no code changes outside content + one release note.

## Compatibility & risks

Registry additions are within `schemaVersion: 1` (new optional fields, new `status`
value — consumers must already ignore unknown fields; a new enum value is the one
soft risk, called out in release notes). CLI older than the change treats deprecated
entries as published — acceptable degradation.

## Alternatives considered

- **Hard-delete renamed ids** — rejected: breaks `related:` links, pinned registries,
  and existing `.map/` workspaces.
- **Semver per pattern** — rejected: catalog-level versioning (repo VERSION) is
  enough; per-pattern versions add ceremony nobody consumes.
- **Auto-expiring claims via bot** — deferred: worth it when claim volume justifies
  automation; the 30-day rule works manually first.
