# Acceptance Criteria — LLM-as-Judge

How to verify an LLM-as-Judge implementation is correct and trustworthy. Use as a
review checklist (humans and AI agents). Pairs with [`prompt.md`](prompt.md) and
[`README.md`](README.md).

## Functional requirements

- [ ] The rubric has 3–6 named criteria, each with a written anchor per score level, and lives in version control.
- [ ] The judge receives input, sources (for grounded criteria), the output under test, the rubric, and worked examples.
- [ ] Judge output is structured and schema-validated: per criterion, a quoted-evidence rationale followed by the score.
- [ ] A calibration command reports exact and within-one agreement against the human-labeled set, per criterion.
- [ ] Reports show per-criterion aggregates with confidence intervals against a named baseline run — no blended single score.
- [ ] Low-confidence / disagreement cases export to a human review queue, and new labels append to the calibration set.

## Non-functional requirements

- [ ] **Reproducibility:** every run records judge model id, prompt version, rubric version, and dataset version; re-running a pinned experiment reproduces its aggregates.
- [ ] **Cost:** judge model choice is configuration; the per-run token cost is reported alongside the scores.
- [ ] **Ordering:** deterministic checks run before the judge and are never delegated to it.
- [ ] **Fail-honest:** unparseable judge replies count as judging failures, never as scores; the failure rate is visible in the report.

## Bias controls

- [ ] Calibration agreement meets the documented bar (e.g. within-one ≥ 90%) before any gate uses the scores.
- [ ] Pairwise mode judges both orderings; order-flips are recorded as ties (position bias measured).
- [ ] The judge model family differs from the system under test, or self-preference has been measured and documented.
- [ ] Score–length correlation has been checked; verbosity bias is addressed in the rubric or normalization.
- [ ] Judge model + prompt are pinned per experiment; a version change triggers re-calibration before results are compared.

## Failure modes

- [ ] **Judge provider outage** → eval run fails loudly and is resumable; no silent partial aggregates (test exists).
- [ ] **Rubric edge case** (output the anchors don't describe) → routed to human review, not force-scored (test exists).
- [ ] **Distribution collapse** (one score level > ~80% of cases) → flagged in the report as a rubric or judge problem.
- [ ] **Sources missing for a grounded criterion** → the case is skipped and counted, not judged on plausibility (test exists).

## Sign-off

- [ ] A human read 20+ judge rationales end-to-end and found them faithful to the rubric.
- [ ] The judge caught a real (or seeded) regression in a golden-set run, per-criterion, before humans did.
