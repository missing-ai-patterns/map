# Decision Guides Specification

| | |
|---|---|
| **Status** | Draft |
| **Issue** | [#77](https://github.com/missing-ai-patterns/map/issues/77) |
| **Owner** | @rajanbor |

## Summary

Define the format and home for the Phase 3 **cross-category decision guides**
("RAG vs Fine-Tuning vs Long-Context", "Single Agent vs Multi-Agent", …): question-first
articles that route a reader to the right patterns. Guides get their own directory and
contract so they can enter the registry and the website without pretending to be
patterns.

## Motivation

The ROADMAP lists five guides with nowhere to put them. Patterns answer *"how does X
work and when do I use it"*; the question users actually arrive with is comparative —
*"X or Y?"*. The examples layer shows whole scenarios; nothing owns the pairwise
decision. Guides are also the website's natural navigation ("navigate by the question
you're asking") and the CLI's natural `map recommend` explanations — both need the
guides machine-readable.

## Design

**Layout** — mirrors patterns, one directory per guide:

```
guides/
  _template/GUIDE_TEMPLATE.md
  rag-vs-fine-tuning-vs-long-context/
    README.md      # the guide (required)
    guide.yaml     # machine-readable: id, question, options, criteria, related ids
    diagram.mmd    # the decision tree (Mermaid source)
```

**README sections** (fixed, like pattern anatomy): the Question; Options at a glance
(one row per option: what it is, choose-when, avoid-when); Decision criteria (the
3–6 dimensions that actually discriminate — freshness, cost profile, latency, team
maturity…); the Decision tree (Mermaid); Combining options (most real systems mix);
Related patterns (links into the catalog); References.

**`guide.yaml`** (validated like `pattern.yaml`, see [pattern schema](pattern-schema.md)):
`id` (`guides/<slug>`), `question`, `options[]` (`name`, `choose_when[]`,
`avoid_when[]`, `patterns[]` — resolvable catalog ids), `criteria[]`, `related[]`,
`references[]`.

**Registry** — a new top-level `guides: []` array in `registry.json` (additive within
`schemaVersion: 1`); every referenced pattern id must resolve or the build fails.
Guides do **not** appear in `patterns[]` and have no MAP Score.

## Implementation plan

1. Add `guides/` with `_template/GUIDE_TEMPLATE.md` and the first guide
   (*RAG vs Fine-Tuning vs Long-Context* — the most-asked question in the ROADMAP
   list), cross-linked from the patterns it routes to.
2. Extend the registry build: parse `guide.yaml`, validate ids, emit `guides: []`;
   extend the ROADMAP "Cross-category decision guides" section parsing so planned
   guides appear with status like patterns do.
3. Update README (three layers table gains guides), ROADMAP links, and the website
   spec's data contract.

## Acceptance criteria

- [ ] First guide published under `guides/` following the template.
- [ ] `registry.json` contains `guides: []` with resolvable pattern ids; `--check` fails on a dangling id.
- [ ] README and ROADMAP link the guides layer.

## Compatibility & risks

Registry change is additive (consumers ignore unknown top-level fields per the
compatibility rules). Risk: guides drift from pattern content as the catalog grows —
mitigated by resolvable-id validation (a guide can't reference a pattern that
disappears) and by keeping choose/avoid bullets in `guide.yaml` short enough to review
with the patterns they cite.

## Alternatives considered

- **Guides as long README sections in each category** — rejected: cross-category
  questions have no single category home; that's the problem.
- **Guides as patterns with a `kind: guide` flag** — rejected: no score, different
  anatomy, different consumers; overloading `patterns[]` complicates every consumer
  for one producer's convenience.
- **Website-only guides** — rejected: the repo is the source of truth; the site
  renders it.
