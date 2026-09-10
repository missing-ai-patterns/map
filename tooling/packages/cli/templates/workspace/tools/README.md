# Project tools

MAP tools operate on the versioned knowledge in this workspace. Their settings
live in `../map.config.json`, so the same checks can run locally and in CI.

## Token optimizer

```bash
map optimize          # inspect the current budget
map optimize --save   # write reports/token-optimization.json
map optimize --check  # fail when the configured budget is exceeded
```

Tune `tools.tokenOptimizer` in `map.config.json` to set the budget and choose
which Markdown sources are included. Generated reports and caches are excluded
by default.
