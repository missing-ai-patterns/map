# MAP document envelope

The document envelope is the YAML frontmatter shared by typed Markdown files in
`.map/`. Frontmatter lets software select and validate a document; the Markdown body
explains the contract to people and agents.

Machine contract: [`document.schema.json`](../../schemas/document.schema.json).

## Fields

| Field | Required | Meaning |
|---|---:|---|
| `kind` | yes | Document type, such as `decision`, `agent`, `prompt`, or a namespaced extension. |
| `id` | yes | Stable identifier unique within `kind`; do not reuse it for different meaning. |
| `title` | yes | Short human name shown by tools. |
| `date` | no | ISO calendar date associated with the document or decision. |
| `status` | yes | Lifecycle state: `proposed`, `draft`, `active`, `accepted`, `rejected`, `superseded`, `deprecated`, or `archived`. |
| `scope` | no | One path glob or a unique list of globs where the contract applies. |
| `priority` | no | Compiler order: `high`, `normal` (default), or `low`. It is not permission or severity. |
| `targets` | no | Target adapters that receive the document. Omission means every configured target. |
| `x-*` | no | Namespaced experimental metadata preserved without becoming part of the stable contract. |

The namespace is the pair `kind` + `id`; an ID does not need to repeat its kind.
Lowercase kebab-case keeps references and Git diffs stable.

## Complete example

```markdown
---
kind: decision
id: adr-0001-human-and-ai-readable-contracts
title: Human- and AI-readable project contracts
date: 2026-09-13
status: accepted
scope: [".map/**", "library/schemas/**"]
priority: high
targets: [agents, claude, cursor]
x-owner: architecture
---

# ADR-0001: Human- and AI-readable project contracts

## Context

People need reasoning and tools need stable fields.

## Decision

Keep typed YAML frontmatter and explanatory Markdown in one canonical file.
```

## Validation and migration

Validation errors identify the file, JSON-style field path, reason, and expected
shape. Existing Markdown without frontmatter remains valid as legacy context and uses
compiler defaults. To make it a typed contract, add all four required fields in one
change; no body rewrite is required. Once published, change meaning through a new
document and lifecycle link rather than reusing an ID.
