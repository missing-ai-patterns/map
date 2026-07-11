"""Invariant tests for the Conversation (Buffer) Memory reference.

These mirror the pattern's acceptance.md correctness checks: the three eviction
invariants, the budget boundary, and the oversized-message failure mode.

Run:  python -m unittest test_example.py
"""

import unittest

from example import (
    ConversationBuffer,
    Message,
    OversizedMessageError,
    whitespace_tokens,
)


def make_buffer(budget: int = 40, keep_recent: int = 2) -> ConversationBuffer:
    return ConversationBuffer(
        system=Message("system", "sys prompt"),
        budget_tokens=budget,
        count_tokens=whitespace_tokens,
        keep_recent=keep_recent,
    )


class InvariantTests(unittest.TestCase):
    def test_system_prompt_survives_any_length(self):
        buffer = make_buffer(budget=30)
        for i in range(100):  # drive to ~10x budget
            buffer.append(Message("user", f"message number {i} with some words"))
        rendered = buffer.render()
        self.assertEqual(rendered[0].role, "system")
        self.assertEqual(rendered[0].content, "sys prompt")

    def test_last_keep_recent_messages_survive(self):
        buffer = make_buffer(budget=30, keep_recent=3)
        for i in range(50):
            buffer.append(Message("user", f"turn {i} padding padding padding"))
        rendered = buffer.render()
        tail = [m.content for m in rendered[-3:]]
        self.assertEqual(tail, ["turn 47 padding padding padding",
                                "turn 48 padding padding padding",
                                "turn 49 padding padding padding"])

    def test_tool_pairs_evict_atomically(self):
        buffer = make_buffer(budget=40, keep_recent=1)
        buffer.append(Message("assistant", "call: search(docs)", tool_pair_id="t1"))
        buffer.append(Message("tool", "result: three matching documents found here", tool_pair_id="t1"))
        for i in range(20):
            buffer.append(Message("user", f"later turn {i} padding padding"))
        rendered = buffer.render()
        pair_ids = [m.tool_pair_id for m in rendered if m.tool_pair_id]
        # Either both halves of t1 are present or neither is.
        self.assertIn(pair_ids.count("t1"), (0, 2))
        self.assertEqual(pair_ids.count("t1"), 0)  # far over budget: both evicted

    def test_eviction_is_oldest_first(self):
        buffer = make_buffer(budget=35, keep_recent=1)
        for i in range(10):
            buffer.append(Message("user", f"turn {i} with padding words here"))
        buffer.render()
        first_evicted = buffer.evictions[0].messages[0]
        self.assertEqual(first_evicted.content, "turn 0 with padding words here")


class BoundaryTests(unittest.TestCase):
    def test_exactly_at_budget_renders_without_eviction(self):
        buffer = make_buffer(budget=100)
        message = Message("user", "one two three four five six")  # 6 + 4 = 10 tokens
        system_cost = whitespace_tokens(buffer.system)
        while system_cost + sum(
            whitespace_tokens(m) for m in buffer.messages
        ) + 10 <= 100:
            buffer.append(message)
        buffer.render()
        self.assertEqual(buffer.evictions, [])

    def test_one_unit_over_budget_evicts_exactly_one_atomic_unit(self):
        buffer = make_buffer(budget=26, keep_recent=1)
        for _ in range(3):  # 3 * 10 = 30 + system 6 = 36 > 26 → evict one → 26 fits
            buffer.append(Message("user", "one two three four five six"))
        buffer.render()
        self.assertEqual(len(buffer.evictions), 1)
        self.assertEqual(len(buffer.evictions[0].messages), 1)

    def test_render_is_pure_given_state(self):
        buffer = make_buffer(budget=30, keep_recent=1)
        for i in range(10):
            buffer.append(Message("user", f"turn {i} padding padding padding"))
        first = [(m.role, m.content) for m in buffer.render()]
        second = [(m.role, m.content) for m in buffer.render()]
        self.assertEqual(first, second)


class FailureModeTests(unittest.TestCase):
    def test_oversized_message_rejected_at_append(self):
        buffer = make_buffer(budget=10)
        with self.assertRaises(OversizedMessageError):
            buffer.append(Message("user", "word " * 50))

    def test_evictions_are_observable(self):
        buffer = make_buffer(budget=30, keep_recent=1)
        for i in range(10):
            buffer.append(Message("user", f"turn {i} padding padding padding"))
        buffer.render()
        self.assertTrue(buffer.evictions)
        self.assertTrue(all(e.messages for e in buffer.evictions))


if __name__ == "__main__":
    unittest.main()
