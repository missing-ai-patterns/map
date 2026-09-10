# Conversation (Buffer) Memory — Python reference

Minimal, dependency-free implementation of the
[Conversation (Buffer) Memory pattern](../../../../patterns/memory/conversation-memory/):
a token-budgeted message buffer with a rule-based, observable eviction policy.

## What it shows

- `ConversationBuffer.render` — history for the next model call, enforcing the three
  eviction invariants: the system prompt is never evicted, the last `keep_recent`
  messages are never evicted, and tool-call/result pairs are evicted atomically.
- `Eviction` — eviction as an observable event (and the seam where summary memory
  plugs in later).
- `OversizedMessageError` — a message bigger than the whole budget is rejected at
  append time, not discovered at render time.

## Run

```bash
python example.py            # demo: a debugging session that evicts under budget
python -m unittest -v        # invariant, boundary, and failure-mode tests
```

No dependencies (Python 3.10+). The demo counts tokens by whitespace as a stand-in;
production code must count with the model's real tokenizer — see the pattern's
Failure Modes for why `len(text)/4` heuristics bite.
