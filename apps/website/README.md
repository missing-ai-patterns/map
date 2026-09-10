# MAP Website

The ultra-simple site for [MAP — Missing AI Patterns](https://github.com/rajanbor/map):
a hero with the install command, what MAP is, the pattern catalog, one worked example,
and pointers into the docs. Spec: [`library/docs/specs/website.md`](https://github.com/rajanbor/map/blob/main/library/docs/specs/website.md).

**Live:** <https://rajanbor.github.io/map/>

## How it works

Plain HTML + one CSS file, no framework, no dependencies. `scripts/build.mjs` fetches
the published registry — the same `registry.json` every MAP tool consumes — and renders
the catalog section into `site/index.html`, writing the result to `dist/`. The page
works with JavaScript disabled.

```bash
node scripts/build.mjs                                  # build from the latest release
REGISTRY_FILE=…/map/dist/registry.json node scripts/build.mjs   # offline, local checkout
open dist/index.html
```

## Deployment

GitHub Pages via `.github/workflows/pages.yml`: on every push to `main`, weekly, on
manual dispatch, and on `repository_dispatch` (type `registry-updated`) so map releases
can trigger a refresh. A failed registry fetch fails the build — Pages keeps serving
the previous deploy; an empty catalog is never published.

## License

MIT. The catalog content the site renders is CC BY 4.0 (see
[LICENSING in the map repo](https://github.com/rajanbor/map/blob/main/library/LICENSING.md)).
