# Prompt Injection Defense — Python reference

Minimal, dependency-free implementation of the two cheapest layers of the
[Prompt Injection Defense pattern](../../../../patterns/security/prompt-injection-defense/):
quarantine on the way in, egress screening on the way out.

## What it shows

- `quarantine` — wrap untrusted content as inert, marked data: Unicode NFKC
  normalization, control/invisible character stripping, marker-forgery defanging,
  provenance, and oversized-input truncation.
- `egress_violations` — screen model output for non-allowlisted links and
  auto-loading markdown images (both are exfiltration channels).
- `assemble_prompt` — privileged instructions composed separately from quarantined
  data, with the data contract stated in the system prompt.

## Run

```bash
python example.py            # demo: a poisoned document, quarantined and screened
python -m unittest -v        # adversarial tests (marker forgery, zero-width tricks…)
```

No dependencies (Python 3.10+). This is a teaching aid: tool gating, input screening,
and audit logging are deliberately out of scope here — see the pattern's Flow and
Production Variants for the full layered defense.
