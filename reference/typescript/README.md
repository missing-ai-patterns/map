# TypeScript Reference Implementations

Minimal, framework-agnostic TypeScript examples of MAP patterns.

## Conventions

- Target a recent Node LTS and modern TypeScript.
- Prefer built-ins and a minimal toolchain. If a dependency is essential, add it to a
  local `package.json` inside the pattern folder and explain why in its README.
- Each example is self-contained: `reference/typescript/<category>/<pattern-slug>/`.
- Include a short `README.md` with how to run it and what it demonstrates.
- Run on Node-native TypeScript (Node 22.6+ type stripping) — no build step, the same
  way the repo's registry builder runs.
- Ship tests: an `example.test.ts` next to the example using `node:test` +
  `node:assert`, runnable with `node --test example.test.ts`. CI (the `Reference`
  workflow) runs every suite, so examples can't rot silently.
- Favor clarity over abstraction.

## Layout

```
reference/typescript/
  <category>/
    <pattern-slug>/
      README.md
      example.ts
      example.test.ts   # node:test suite, run by CI
      package.json      # only if a dependency is truly needed
```

Link back to the pattern article from the example's README, and from the pattern's
**Reference Implementation** section to here.
