# Implementation Prompt — LLM-as-Judge

> Paste this into your AI coding agent (Claude Code / Cursor / Gemini CLI) to add
> **model-graded evaluation** to an existing LLM application. Read
> [`README.md`](README.md) first; verify against [`acceptance.md`](acceptance.md).

## Goal

Build a judge pipeline that grades this system's outputs against an anchored rubric,
is calibrated against human labels with a recorded agreement rate, controls the known
judge biases, and reports per-criterion aggregates that can gate releases.

## Context

- **Project:** <describe: language, LLM provider(s), what the system produces, where
  outputs and their inputs/sources can be collected from>.
- **Quality criteria that matter:** <e.g. faithfulness to retrieved sources,
  completeness, tone, policy compliance>.
- **Existing labels:** <how many human-labeled examples exist, or the plan to label
  50–150 starter cases>.
- **Related MAP pattern:** evaluation/llm-as-judge — follow its documented flow and
  bias controls.

## Requirements

- **Anchored rubric.** 3–6 named criteria, each on a small scale (1–4 or binary) with
  a written anchor per level. The rubric lives in version control next to the eval
  code.
- **Judge prompt.** Provides input, sources (for grounded criteria), the output under
  test, the rubric with anchors, and worked examples. Requires structured output with
  a quoted-evidence **rationale before the score**, per criterion.
- **Calibration.** A command that runs the judge over the human-labeled set and
  reports exact and within-one agreement per criterion. The measured rate is stored
  with the judge version.
- **Bias controls.** Judge model + prompt version pinned per experiment; for pairwise
  mode, both orderings judged and order-flips counted as ties; judge model from a
  different family than the system under test where possible, otherwise
  self-preference is measured; verbosity correlation checked.
- **Aggregation & reporting.** Per-criterion aggregates with confidence intervals,
  compared against a named baseline run. No single blended score anywhere.
- **Disagreement routing.** Low-confidence and rubric-edge cases export to a human
  review queue; new human labels append to the calibration set.

## Constraints

- Judging runs offline / out of the user path (CI, batch); any inline guardrail judge
  is a separately scoped, latency-budgeted component.
- Structured judge output is schema-validated; unparseable judge replies are retried
  once, then counted as judging failures — never as scores.
- Deterministic checks (schema, exact-match, required-phrase) run *before* the judge
  and are never delegated to it.
- Every experiment records: judge model id, prompt version, rubric version, dataset
  version, and calibration rate.

## Anti-patterns to avoid (do NOT do these)

- **Unanchored 1–10 scales** — noise centered on 7.
- **One blended score** — per-criterion or it hides the regression.
- **Score before rationale** — invites post-hoc rationalization.
- **Floating judge version** — provider updates silently re-score history.
- **Judging faithfulness without sources** — that grades plausibility.
- **Self-grading feedback loops** — same model generating and judging as the only
  signal.

## Suggested steps

1. Write the rubric with anchors; review it with the humans who currently judge
   quality by hand.
2. Build the judge prompt + structured-output parsing; run it on 10 cases and read
   every rationale — fix the rubric where the judge's reasoning surprises you.
3. Label (or collect) the calibration set; implement the agreement command; iterate
   prompt/rubric until within-one agreement meets your bar (≥ ~90% is common).
4. Implement aggregation with per-criterion confidence intervals and
   baseline comparison; wire it to the golden-set regression run in CI.
5. Add disagreement routing to a human queue and the label-appending loop.
6. Pin versions, document the calibration rate, and verify with
   [`acceptance.md`](acceptance.md).
