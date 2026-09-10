# <Name> Specification

<!--
How to introduce a change to MAP with a spec.

WHEN TO WRITE A SPEC (vs. an RFC vs. just a PR):
- Spec  — a concrete contract or process change that tools or contributors will rely
          on: a file format, a validation rule, a workflow, a site. Lives here.
- RFC   — a decision that shapes what MAP *is* (rfcs/). Bigger than one contract.
- PR    — anything self-evident. Typos, one pattern, a broken link: no spec needed.

PROCESS:
1. Open an issue describing the problem (every change starts as an issue).
2. Copy this template to docs/specs/<kebab-case-name>.md; fill it in; set
   Status: Draft. PR it into dev (branch: docs/...). Merging a Draft means "we
   agree this is worth designing", not "build it".
3. Implement in follow-up PRs that reference the spec. When the acceptance
   criteria below are met, flip Status to Implemented in that final PR.
4. If the design is abandoned, flip Status to Withdrawn (don't delete — the
   reasoning stays useful).

Keep the final document under ~150 lines. Delete every comment like this one.
-->

| | |
|---|---|
| **Status** | Draft \| Implemented \| Withdrawn |
| **Issue** | #NNN |
| **Owner** | @github-handle |

## Summary

<!-- 2–4 sentences. What changes, for whom, and what becomes possible. A reader
should be able to stop here and know whether the rest concerns them. -->

## Motivation

<!-- The problem as it exists today, concretely: what breaks, what is manual, what
drifts. Cite real files/behavior. If nothing hurts yet, say what this prevents. -->

## Design

<!-- The contract itself. Formats with examples, rules with their failure behavior,
directory layouts as trees. Be exact where tools will depend on it; stay silent where
implementations should be free. This is the section people will link to. -->

## Implementation plan

<!-- Ordered, PR-sized steps. Each step should leave the repo consistent (CI green,
docs truthful). Name the files/workflows each step touches. -->

1. …
2. …

## Acceptance criteria

<!-- Checkable statements that define "Implemented". These are what the final PR
verifies before flipping the status. -->

- [ ] …
- [ ] …

## Compatibility & risks

<!-- Who consumes today's behavior and what happens to them. Registry schemaVersion
implications, CLI versions, existing content. Include the rollback story. -->

## Alternatives considered

<!-- The designs you rejected and the one-line reason each. Future readers will
propose these again; save everyone the round trip. -->
