# Decisions

Architecture Decision Records (ADRs) for AI-related choices: RAG vs fine-tuning,
which retrieval strategy, when to add memory, model routing policy. One file per
decision, named `NNNN-short-title.md`, stating context, options, decision, and
consequences. `map explain <pattern-id>` gives the trade-off material to cite.

Use YAML frontmatter for machine-readable identity and lifecycle state. Copy
`ADR_TEMPLATE.md` in newly initialized workspaces, and do not rewrite accepted
decisions in place when their meaning changes; supersede them with a new ADR.
