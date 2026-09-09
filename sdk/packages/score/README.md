# @missing-ai-patterns/score

MAP Score: a compact **1–5 star rating system** for MAP patterns, so each pattern can
be judged at a glance across five dimensions — **Complexity, Latency, Cost, Accuracy
Impact, Production Readiness**.

This package is the schema, validation, and rendering. The canonical specification
lives in the map repository:
[`docs/specs/map-score.md`](https://github.com/missing-ai-patterns/patterns/blob/main/docs/specs/map-score.md).

## Why

A pattern page answers "how does this work". MAP Score answers "what will this cost me"
before you read it — is it simple or complex, cheap or expensive, safe to ship or
experimental. It's the 20-second version of the trade-offs.

## Use it

```ts
import {
  parseScore,
  renderStars,
  renderScoreSummary,
  renderScoreTable,
  DIMENSIONS,
} from "@missing-ai-patterns/score";

const score = parseScore({
  pattern: "retrieval/chunking",
  complexity: 2,
  latency: 5,
  cost: 5,
  accuracyImpact: 5,
  productionReadiness: 5,
});

renderStars(score.complexity);   // "★★☆☆☆"
renderScoreSummary(score);       // "Complexity ★★☆☆☆ · Latency ★★★★★ · …"
renderScoreTable(score);         // Markdown table for pattern pages
```

Consumers: the [MAP CLI](../cli/) (`map patterns`, `map explain`), the map
repository's registry builder, and the future website.

## Develop

```bash
pnpm --filter @missing-ai-patterns/score test
pnpm --filter @missing-ai-patterns/score build
```
