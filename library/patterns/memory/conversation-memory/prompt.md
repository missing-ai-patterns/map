# Implementation Prompt — Conversation (Buffer) Memory

> Paste this into your AI coding agent (Claude Code / Cursor / Gemini CLI) to add
> disciplined **conversation memory** to an existing LLM application. Read
> [`README.md`](README.md) first; verify against [`acceptance.md`](acceptance.md).

## Goal

Replace ad-hoc history handling with a conversation buffer component: message history
(including tool calls and results) replayed into every model call, bounded by an
explicit token budget, with a tested eviction rule — so long conversations degrade
predictably instead of hitting the context limit.

## Context

- **Project:** <describe: language, LLM provider, chat vs. agent loop, how history is
  currently kept (in-memory list? DB? nothing?), session lifetime and storage>.
- **Model window & budget:** <model context size; how much is reserved for system
  prompt, retrieved context, and the response>.
- **Symptoms today:** <e.g. "context_length_exceeded on long sessions", "bot forgets
  constraints mid-conversation", "cost grows per turn">.
- **Related MAP pattern:** memory/conversation-memory — follow its documented flow.

## Requirements

- **Buffer as a component.** One class/module owns the per-session message sequence
  (user, assistant, tool call, tool result), with persistence matching session
  lifetime and a TTL/deletion path.
- **Explicit token budget.** A configured slice of the context window is reserved for
  history; token counts come from the real tokenizer, not character heuristics.
- **Eviction by rule.** When over budget, evict oldest-first, with three invariants:
  the system prompt is never evicted; the last *k* messages are never evicted;
  tool-call/result pairs are evicted atomically (no orphans).
- **Everything appended.** Assistant tool calls and their results enter the buffer as
  they happen; the rendered history reconstructs the exact dialogue.
- **Observable eviction.** Eviction events are logged with what was dropped (count,
  roles, token totals); a hook exposes evicted messages so summary memory can be
  layered on later without redesign.
- **Stable rendering.** Within a session the rendered prefix is append-only and
  byte-stable (prompt-cache friendly); no reordering or rewriting of past turns.

## Constraints

- No extra model calls in this pattern (summarization is a separate, later pattern).
- Session boundaries reset the buffer; cross-session memory is out of scope here.
- Budget, `keep_recent`, and TTL are configuration, not literals.
- Do not route documents through the buffer — retrieval stays retrieval.

## Anti-patterns to avoid (do NOT do these)

- **No budget until the API errors** — the exception is not an eviction policy.
- **Evicting the system prompt** or the most recent turns.
- **Orphaned tool messages** — dropping a call but keeping its result, or vice versa.
- **`len(text)/4` token math** — drifts badly on code and non-English text.
- **Rewriting history per turn** — breaks prompt caching and reproducibility.
- **Buffers that never expire** — unbounded PII and storage accumulation.

## Suggested steps

1. Introduce the `ConversationBuffer` type (messages, budget, `keep_recent`,
   tool-pair links) and route all history reads/writes through it.
2. Wire real tokenizer counts; set the budget from the model window minus the
   declared reservations (system prompt, retrieval, response headroom).
3. Implement `render()` with the three eviction invariants; unit-test each invariant,
   including the orphaned-tool-pair case.
4. Add eviction logging and the evicted-messages hook.
5. Add session TTL/deletion; verify restart behavior matches session semantics.
6. Test a long synthetic conversation: cost per turn flattens at the budget, the
   system prompt survives, and the model still resolves recent references. Verify
   with [`acceptance.md`](acceptance.md).
