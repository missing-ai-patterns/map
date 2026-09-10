# MAP RFCs

Substantial changes to MAP — the specification, the workspace format, the registry,
governance — go through an RFC (Request for Comments) before implementation. Small
fixes, new patterns, and docs improvements do **not** need an RFC; use a normal issue
and PR.

## Process

1. Open an issue describing the problem (label: `rfc`).
2. Copy the structure of an existing RFC into `rfcs/NNNN-short-title.md` (next free
   number) and open a PR into `dev`.
3. Discussion happens on the PR. The RFC is edited in place until consensus.
4. A maintainer merges the RFC with a status of `accepted`, or closes the PR with the
   reasons recorded in the RFC's `status` section (`rejected`, `postponed`).
5. Implementation PRs reference the RFC. When shipped, the RFC's status becomes
   `implemented` (with the version that shipped it).

An RFC is a **decision record**, not documentation: once accepted it is edited only to
update its status or add errata. The living documentation lives in `docs/`.

## Index

| RFC | Title | Status |
|-----|-------|--------|
| [0001](0001-map-standard.md) | The MAP Standard — one canonical description of an AI-native project | draft |
