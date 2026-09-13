# Architecture decision records

A MAP ADR records why a durable choice was made. Its frontmatter is structured for
indexing and lifecycle checks; its Markdown is the complete reviewable explanation.

Machine contract: [`decision.schema.json`](../../schemas/decision.schema.json).

## Frontmatter

| Field | Required | Meaning |
|---|---:|---|
| `kind` | yes | Always `decision`. |
| `id` | yes | Stable ADR identifier, normally `adr-NNNN-short-title`. |
| `title` | yes | Human-readable decision title. |
| `status` | yes | `proposed`, `accepted`, `rejected`, or `superseded`. |
| `date` | yes | Decision date in `YYYY-MM-DD`. |
| `owners` | yes | People accountable for the decision. |
| `tags` | no | Searchable lowercase topics. |
| `supersedes` | no | Older ADR IDs replaced by this decision. |
| `supersededBy` | conditional | Required when status is `superseded`. |
| `scope`, `priority`, `targets`, `x-*` | no | Shared [document envelope](document.md) fields. |

## Required Markdown sections

`Context`, `Decision`, `Consequences`, and `Verification` are required for accepted
ADRs. Proposed ADRs add `Alternatives considered` before review. A section must say
what is unknown rather than remain empty.

## Complete example

```markdown
---
kind: decision
id: adr-0002-local-validation
title: Validate contracts offline
status: accepted
date: 2026-09-13
owners: [platform-team]
tags: [validation]
---

# ADR-0002: Validate contracts offline

## Context
CI and local development need identical validation.

## Decision
Contract validation MUST run without network access.

## Consequences
Schemas and fixtures ship in the repository.

## Verification
The schema CI job succeeds with networking unavailable.
```

## Lifecycle and compatibility

Do not edit the meaning of an accepted ADR. Create a new ADR with `supersedes`, then
mark the old one `superseded` and set `supersededBy`. Validators reject a dangling
reference. Reverting implementation does not erase the record; add a new decision
that explains the rollback.
