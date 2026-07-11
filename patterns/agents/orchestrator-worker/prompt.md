# Implementation Prompt — Orchestrator–Worker

> Paste this into your AI coding agent (Claude Code / Cursor / Gemini CLI) to add an
> **orchestrator–worker** architecture to an existing agent system. Read
> [`README.md`](README.md) first; verify against [`acceptance.md`](acceptance.md).

## Goal

Restructure a task that currently overwhelms one agent into a control plane: an
orchestrator that decomposes the goal into bounded, schema-typed sub-tasks, dispatches
them to isolated worker agents (parallel where independent), validates the results, and
synthesizes the final answer — with budgets, retries, and tracing built in from day one.

## Context

- **Project:** <describe: language, agent runtime/SDK, which LLM(s), how the current
  single agent is invoked>.
- **Task to decompose:** <the concrete workload, e.g. "compare N vendor documents
  against a checklist", "review every file touched by a PR">.
- **Evidence orchestration is needed:** <the measured failure: context exhaustion at
  ~X tokens, serial latency of Y minutes, one bad sub-result poisoning the answer>.
- **Related MAP pattern:** agents/orchestrator-worker — follow its documented flow and
  trade-offs.

## Requirements

- **Sub-task spec as a typed object.** Each sub-task carries: objective, inputs, tool
  scope, budgets (tokens, tool calls, wall clock), and the **output schema** the worker
  must return. No free-form "go research X" dispatches.
- **Context isolation.** Each worker runs in a fresh context containing only its spec
  and scoped tools — never the orchestrator's system prompt, other workers' state, or
  credentials beyond its scope.
- **Parallel dispatch for independent sub-tasks;** sequential only where a real data
  dependency exists.
- **Budgets enforced, not advisory.** A worker that hits its budget returns
  `status: partial` with whatever it has; it never raises out of the task.
- **Result validation.** The orchestrator validates every result against the sub-task's
  schema and treats worker output as **untrusted data** (workers read untrusted
  content); per sub-task it accepts, retries with a refined spec (bounded retry count),
  or degrades — proceeding without the result and flagging it in the final answer.
- **Synthesis with provenance.** The final pass consumes only validated results and
  attributes claims to the worker/source that produced them.
- **Tracing.** One task id spans the orchestrator and all workers; log per-worker
  tokens, tool calls, budget hits, retries, latency, and final status.

## Constraints

- Keep the single-agent path available behind a flag or router — orchestration must be
  measurable against the baseline, not a replacement for it.
- Depth limit: orchestrator → workers, one level. Workers do not spawn workers.
- Worker results cross the boundary as data (JSON per schema), never as instructions
  or executable content.
- Budgets, retry counts, and worker model choices live in configuration.

## Anti-patterns to avoid (do NOT do these)

- **Multi-agent by default** — shipping this without a measured single-agent failure.
- **Vague sub-tasks** — dispatching themes instead of bounded objectives with schemas.
- **Unbounded workers** — any worker without token/step/time budgets.
- **Trusting worker output** — merging unvalidated results, or letting text returned by
  a worker trigger tools directly.
- **Telephone-game depth** — nested worker hierarchies that add a summarization loss
  per level.
- **Shared mutable context** — workers writing into each other's windows.

## Suggested steps

1. Write the `SubTask` / `WorkerResult` types (spec, budgets, schema, status) and the
   validation function.
2. Extract the worker: a single agent loop that accepts a spec, runs with scoped tools
   in a fresh context, and returns a schema-shaped result under budget.
3. Implement the orchestrator: decomposition prompt (or code) → specs → parallel
   dispatch → collect/validate/retry/degrade → synthesis call with provenance.
4. Wire budgets and the one-level depth limit; make budget exhaustion produce
   `partial`, not an exception.
5. Add tracing: task id propagation, per-worker metrics, final cost/latency summary.
6. Evaluate against the single-agent baseline on your golden set (quality, latency,
   tokens). Keep the flag until the numbers justify the default. Verify with
   [`acceptance.md`](acceptance.md).
