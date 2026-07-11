"""Minimal, dependency-free reference for the MAP Conversation (Buffer) Memory pattern.

A conversation buffer with the three eviction invariants from the pattern:
  1. the system prompt is never evicted,
  2. the last `keep_recent` messages are never evicted,
  3. tool-call/result pairs are evicted atomically (no orphans).

`count_tokens` is injected so the buffer stays tokenizer-agnostic; the demo uses a
whitespace count as a stand-in — production code must use the model's tokenizer.

Run:  python example.py
Test: python -m unittest test_example.py
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Message:
    role: str                        # system | user | assistant | tool
    content: str
    tool_pair_id: str | None = None  # links a tool call to its result


@dataclass
class Eviction:
    """What render() dropped — the observable event and the summary-memory seam."""

    messages: list[Message]


class OversizedMessageError(ValueError):
    """A single message larger than the whole budget is a caller bug: reject at append."""


@dataclass
class ConversationBuffer:
    system: Message
    budget_tokens: int
    count_tokens: Callable[[Message], int]
    keep_recent: int = 4
    messages: list[Message] = field(default_factory=list)
    evictions: list[Eviction] = field(default_factory=list)

    def append(self, message: Message) -> None:
        if self.count_tokens(message) > self.budget_tokens:
            raise OversizedMessageError(
                f"message of {self.count_tokens(message)} tokens exceeds the whole "
                f"budget ({self.budget_tokens}); send bulk content through retrieval"
            )
        self.messages.append(message)

    def render(self) -> list[Message]:
        """History for the next model call: evict oldest-first, atomically, in budget."""
        kept = list(self.messages)
        evicted: list[Message] = []

        def total() -> int:
            return self.count_tokens(self.system) + sum(self.count_tokens(m) for m in kept)

        while total() > self.budget_tokens and len(kept) > self.keep_recent:
            victim = kept.pop(0)
            evicted.append(victim)
            if victim.tool_pair_id is not None:  # invariant 3: never orphan a pair
                partners = [m for m in kept if m.tool_pair_id == victim.tool_pair_id]
                for partner in partners:
                    kept.remove(partner)
                    evicted.append(partner)

        if evicted:
            self.evictions.append(Eviction(evicted))
        return [self.system, *kept]


def whitespace_tokens(message: Message) -> int:
    """Demo stand-in. Production: the model's real tokenizer (invariant in tests)."""
    return len(message.content.split()) + 4  # +4 ≈ per-message overhead


def _demo() -> None:
    buffer = ConversationBuffer(
        system=Message("system", "You are a helpful coding assistant."),
        budget_tokens=60,
        count_tokens=whitespace_tokens,
        keep_recent=2,
    )
    turns = [
        Message("user", "Here is the stack trace: ValueError in orm.py line 42"),
        Message("assistant", "That is a type coercion bug. Let me check the model."),
        Message("assistant", "call: read_file(orm.py)", tool_pair_id="t1"),
        Message("tool", "def save(self): value = int(self.raw)  # crashes on ''", tool_pair_id="t1"),
        Message("user", "We cannot upgrade the ORM, platform team locked it."),
        Message("assistant", "Understood. Guard the coercion instead of upgrading."),
        Message("user", "OK apply the fix we discussed."),
    ]
    for turn in turns:
        buffer.append(turn)

    print("== rendered history ==")
    for message in buffer.render():
        pair = f" [pair {message.tool_pair_id}]" if message.tool_pair_id else ""
        print(f"{message.role:>9}{pair}: {message.content[:60]}")
    print(f"\nevictions: {[len(e.messages) for e in buffer.evictions]}")


if __name__ == "__main__":
    _demo()
