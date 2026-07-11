# Acceptance Criteria — Prompt Injection Defense

How to verify a Prompt Injection Defense implementation is correct and production-safe.
Use as a review checklist (humans and AI agents). Pairs with [`prompt.md`](prompt.md)
and [`README.md`](README.md).

## Functional requirements

- [ ] Every channel of third-party text (retrieval, uploads, tool results, web content) passes through one quarantine step before prompt assembly.
- [ ] Untrusted spans are wrapped in explicit data markers carrying provenance (source, trust tier).
- [ ] The system prompt states the data contract (content in markers is data, never instructions) and is assembled server-side, never concatenated with untrusted text.
- [ ] Marker syntax occurring *inside* untrusted content is neutralized (forged "end of data" is inert).
- [ ] Tools are classified by risk tier; mutating/outward-facing tools require a policy check or human confirmation.
- [ ] Model responses pass an output filter: URL/host allowlist, markdown-image defang, secret/PII leakage checks, schema validation for structured output.

## Non-functional requirements

- [ ] **Latency:** the common clean path adds no extra model calls; marking + output checks are milliseconds.
- [ ] **Maintainability:** markers, allowlists, and tool risk tiers are configuration, not scattered string literals.
- [ ] **Determinism:** quarantine and output filtering are pure functions of input + config.
- [ ] **Fail-closed:** if the output filter or tool gate errors, the action/response is blocked, not passed through.

## Security checks

- [ ] A retrieved document containing "ignore previous instructions…" is reported as content, not obeyed (adversarial test exists).
- [ ] A document that forges the data-close marker cannot escape quarantine (test exists).
- [ ] An answer linking to a non-allowlisted host is blocked or defanged (test exists).
- [ ] A tool-escalation attempt originating from untrusted content is denied by the gate and logged (test exists).
- [ ] Input normalization strips invisible/control Unicode (homoglyph & zero-width tricks covered by a test).
- [ ] Flagged inputs, gate denials, and blocked outputs are logged with provenance and surfaced in monitoring.

## Failure modes

- [ ] **Guard/classifier unavailable** → system degrades to structural defenses (marking + gates + output filter), never to "open".
- [ ] **Legitimate content that looks like an attack** (e.g. an article *about* prompt injection) → flagged path still answers, with stricter handling; no hard user-facing failure.
- [ ] **Oversized/garbage untrusted input** → quarantine truncates/rejects without crashing prompt assembly.

## Sign-off

- [ ] The adversarial test set (poisoned chunk, marker forgery, link exfiltration, tool escalation) runs in CI.
- [ ] Someone tried to break it on purpose and the attempts are documented.
