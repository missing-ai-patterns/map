---
kind: decision
id: adr-0001-human-and-ai-readable-contracts
title: Human- and AI-readable project contracts
status: accepted
date: 2026-09-13
priority: high
targets: [agents, claude, gemini, cursor, copilot]
---

# ADR-0001: Human- and AI-readable project contracts

## Context

MAP is both documentation for people and input for software agents. Prose alone is
easy to read but hard to validate and compose. Machine-only configuration is precise
but hides intent, trade-offs, and exceptions from reviewers. Maintaining separate
human and machine documents would create drift.

## Decision

Every MAP contract uses one canonical artifact with two layers:

1. YAML frontmatter contains stable identity, document kind, lifecycle state, scope,
   and other fields that tools need to select or validate the document.
2. Markdown explains intent, boundaries, examples, and consequences in plain language.

The normative words `MUST`, `SHOULD`, and `MAY` express requirement strength. A
contract MUST define its owner or status, inputs, outputs, constraints, failure
behavior, and acceptance criteria when those concepts apply. IDs and field names are
stable; changing their meaning requires a new ADR or schema version.

JSON Schema draft 2020-12 is the machine contract for structured MAP documents.
Schemas live in `library/schemas/`, use `additionalProperties: false` by default, and
reserve `x-` prefixed fields for extensions. Examples and validation errors MUST use
the same vocabulary as the accompanying Markdown.

Generated files such as `AGENTS.md` are projections. Authors edit `.map/`, then run
`map sync`; generated targets are never an independent source of truth.

## Consequences

- A reviewer can understand a contract without running MAP.
- An agent can identify, filter, and verify a contract without guessing from prose.
- CI can reject malformed data while still allowing useful explanations and examples.
- Authors must keep frontmatter and prose consistent in the same change.
- Schemas add versioning work, but make compatibility explicit and testable.

## Verification

- New document schemas validate at least one valid and one invalid fixture.
- Every schema has a short human guide with a complete example.
- `map doctor`, tests, and generated-context checks pass before merge.
- A change that alters an existing contract documents compatibility and migration.
