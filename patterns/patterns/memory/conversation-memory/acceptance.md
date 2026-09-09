# Acceptance Criteria — Conversation (Buffer) Memory

How to verify a Conversation Memory implementation is correct and production-safe.
Use as a review checklist (humans and AI agents). Pairs with [`prompt.md`](prompt.md)
and [`README.md`](README.md).

## Functional requirements

- [ ] All history reads/writes go through one buffer component; no handler keeps its own message list.
- [ ] The buffer records user, assistant, tool-call, and tool-result messages; the rendered history reconstructs the dialogue exactly.
- [ ] A configured token budget bounds rendered history; counts come from the model's tokenizer.
- [ ] Eviction is oldest-first with invariants: system prompt never evicted; last *k* messages never evicted; tool-call/result pairs evicted atomically.
- [ ] Multi-turn references resolve: a scripted conversation where turn *n* depends on turn *n−2* passes.
- [ ] Session boundaries reset the buffer; sessions have a TTL and a deletion path.

## Non-functional requirements

- [ ] **Cost:** tokens per turn flatten at the budget in a long synthetic conversation (measured, not assumed).
- [ ] **Cache-friendliness:** within a session the rendered prefix is append-only and byte-stable across turns.
- [ ] **Determinism:** given the same buffer state, `render()` is a pure function.
- [ ] **Configuration:** budget, `keep_recent`, and TTL are config values.

## Correctness checks

- [ ] Eviction of a message with a tool pair removes both halves (test exists for the orphan case).
- [ ] A conversation exactly at the budget boundary renders without eviction; one token over evicts exactly one atomic unit (boundary test exists).
- [ ] The system prompt survives any conversation length (test drives the buffer to 10× budget).
- [ ] Non-ASCII and code-heavy content is counted with the tokenizer (a test would fail under `len/4` heuristics).

## Failure modes

- [ ] **Eviction drops a load-bearing fact** → the event is logged with what was dropped, and the evicted-messages hook exposes it (the summary-memory seam exists).
- [ ] **Oversized single message** (bigger than the whole budget) → rejected or truncated explicitly at append time, not at render time (test exists).
- [ ] **Store unavailable** (for persisted sessions) → the turn fails explicitly; no silent fresh-buffer amnesia.

## Sign-off

- [ ] A real long session was replayed end-to-end: per-turn token counts, eviction events, and answer quality reviewed by a human.
- [ ] The upgrade path is documented: which signal (eviction losses) will trigger adding summary/long-term memory.
