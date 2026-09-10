# Acceptance Criteria — Orchestrator–Worker

How to verify an Orchestrator–Worker implementation is correct and production-safe.
Use as a review checklist (humans and AI agents). Pairs with [`prompt.md`](prompt.md)
and [`README.md`](README.md).

## Functional requirements

- [ ] Every dispatch is a typed sub-task spec: objective, inputs, tool scope, budgets (tokens / tool calls / wall clock), and an output schema.
- [ ] Workers run in isolated contexts: no orchestrator system prompt, no other worker's state, no credentials beyond the declared tool scope.
- [ ] Independent sub-tasks execute in parallel; only real data dependencies serialize.
- [ ] Every worker result is validated against its schema before synthesis; invalid or missing results trigger bounded retry or explicit degradation, never silent inclusion.
- [ ] The final answer is synthesized only from validated results and attributes claims to their producing worker/source.
- [ ] The single-agent baseline path still exists (flag or router) for comparison.

## Non-functional requirements

- [ ] **Budgets are enforced:** a worker at its token/step/time limit returns `status: partial`; nothing unwinds the whole task.
- [ ] **Depth is limited:** orchestrator → worker is one level; workers cannot spawn workers.
- [ ] **Cost visibility:** per-worker and per-task token counts are recorded; the 3–15× multiplier is a dashboard number, not a surprise.
- [ ] **Configuration:** budgets, retry counts, and per-worker model/tool choices live in config, not literals.

## Security checks

- [ ] Worker output is treated as untrusted data: schema-validated, never executed, never able to trigger tools directly (see security/prompt-injection-defense).
- [ ] A worker fed a poisoned document can corrupt at most its own result — an adversarial test proves the injected instruction does not reach synthesis as an instruction.
- [ ] Tool scopes are least-privilege per worker; a read-only research worker cannot invoke mutating tools (test exists).

## Failure modes

- [ ] **One worker fails/times out** → task completes degraded, with the gap flagged in the answer (test exists).
- [ ] **All workers fail** → orchestrator returns an explicit failure with per-worker statuses, not a hallucinated synthesis (test exists).
- [ ] **Worker returns schema-valid nonsense** → provenance in the synthesis lets a reviewer trace any claim back to the worker transcript.
- [ ] **Looping worker** → wall-clock budget fires; the run is visible in traces with the budget-hit reason.

## Sign-off

- [ ] Evaluated against the single-agent baseline on a golden set: quality, end-to-end latency, and total tokens reported side by side.
- [ ] Traces for one full run (orchestrator + every worker, one task id) were reviewed by a human.
