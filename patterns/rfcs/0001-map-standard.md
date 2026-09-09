# RFC-0001: The MAP Standard

- **Status:** draft
- **Issue:** [#63](https://github.com/rajanbor/map/issues/63)
- **Builds on:** the registry ([docs/specs/registry.md](../docs/specs/registry.md)), the
  `.map/` v2 workspace shipped by the CLI, and the pattern catalog.

> One canonical, vendor-neutral description of an AI-native software project.
> `.map/` is the source of truth; `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`,
> Copilot instructions — all generated.

---

## 1. Vision

**The problem.** Every AI coding assistant invented its own way to be told about your
project: `CLAUDE.md`, `.cursor/rules`, `.github/copilot-instructions.md`, `AGENTS.md`,
`.windsurfrules`, `GEMINI.md`, `.aider.conf.yml`. The content is 90% identical —
architecture, conventions, constraints, domain vocabulary — but each file has its own
format, location, loading behavior, and drift. Teams either maintain N copies by hand
(they diverge within weeks), pick one vendor (lock-in), or maintain none (agents fly
blind and repeat the same architectural mistakes MAP's pattern catalog exists to
prevent).

This is the `.editorconfig` moment of AI tooling: a class of tools that all need the
same declarative input, each reading a proprietary file. EditorConfig won not by being
powerful but by being **one small, obvious file that every editor eventually read**.

**Why now.** Three curves are crossing: (1) AI assistants became a default part of the
toolchain, so the per-tool config burden is now a mainstream pain, not an enthusiast
niche; (2) `AGENTS.md` shows the industry converging on *"a file that describes the
project to agents"* but without structure, scoping, tooling, or an upgrade path;
(3) MCP shows vendors will adopt neutral protocols when one exists. The window in
which a neutral standard can still win is open, and it will not stay open long — the
first vendor-blessed format to reach critical mass becomes the de-facto standard.

**If MAP succeeds:** `map init` is as unremarkable as `git init`. Projects carry one
`.map/` directory; every assistant — today's and ones that don't exist yet — gets the
same picture of the project. Architectural knowledge (patterns, decisions, evals)
lives with the code, versioned and reviewed like code. Switching AI vendors costs
nothing, which keeps vendors honest.

**If MAP never exists:** the N-formats problem is "solved" by the biggest vendor's
format winning. Project knowledge fragments across proprietary silos and chat
histories. Teams re-teach every new tool from scratch, and the compounding asset —
a project that *describes itself* — never forms.

## 2. Elevator Pitch

- **One sentence:** MAP is the single source of truth that describes your project to
  every AI coding assistant — write it once, sync it everywhere.
- **30 seconds:** Your project already explains itself to AI tools five times, in five
  formats, all drifting apart. MAP replaces them with one canonical `.map/` directory —
  architecture, rules, patterns, decisions, agent profiles — and a compiler that
  generates `AGENTS.md`, `CLAUDE.md`, Cursor rules, and Copilot instructions from it.
  It's vendor-neutral, Git-native, works offline, and is backed by an open registry of
  proven AI architecture patterns. Like EditorConfig for editors or Terraform for
  infrastructure: declare once, apply everywhere.
- **README introduction:** *MAP (Missing AI Patterns) defines a canonical,
  vendor-neutral description of an AI-native software project. The `.map/` directory
  is the source of truth for everything an AI assistant needs to work on your codebase
  — context, rules, adopted patterns, decisions, evals, and agent profiles. The `map`
  CLI validates it, syncs it into every assistant's native format, and connects it to
  an open registry of AI architecture patterns.*
- **GitHub description:** `The vendor-neutral standard for describing AI-native
  projects. One .map/ directory, synced to every AI coding assistant.`
- **Tagline:** *Write once. Every agent understands.*
- **Website headline:** *Your project, explained to every AI — from one source of
  truth.*

## 3. Core Philosophy

What MAP believes, in the tradition of Git/Docker/Terraform/Unix:

1. **The project describes itself.** Knowledge about a codebase belongs *in* the
   codebase — versioned, diffed, reviewed — not in a vendor's cloud, a chat history,
   or a developer's head. (Git: history belongs to the repository, not the server.)
2. **Declare state, compile artifacts.** Humans maintain the canonical description;
   machines derive every vendor format from it. Generated files are build outputs —
   reproducible, disposable, never the place you edit. (Terraform: desired state in,
   real state out.)
3. **Standards outlive tools.** Assistants will change beyond recognition in five
   years; a good description of a project will not. MAP specifies the *description*,
   not the assistant — so the spec is the product and the CLI is just its reference
   implementation. (Unix: text streams outlived every program that read them.)
4. **Small core, open edges.** Everything that can be an extension is an extension.
   A standard dies of scope creep before it dies of missing features. (EditorConfig:
   a dozen keys, twenty years of relevance.)
5. **Meet tools where they are.** MAP does not ask vendors for permission — it
   compiles to whatever they already read. Adoption must be unilateral: one team can
   adopt MAP today with zero cooperation from any vendor. (Docker won by wrapping
   what existed, not replacing it.)

## 4. Design Principles

- **Single source of truth.** Every fact lives in exactly one file in `.map/`.
  Anything found elsewhere (`CLAUDE.md`, `.cursor/rules`) is generated and marked as
  such. *Why:* drift is the disease; deduplication is the cure.
- **Vendor neutral.** The spec never names a vendor; vendor knowledge lives in
  plugins. The spec repo and governance are independent of any AI company. *Why:*
  a standard owned by one vendor is a product roadmap, not a standard.
- **Human editable, AI legible.** Canonical files are Markdown with YAML frontmatter —
  the one format that humans write fluently, Git diffs cleanly, and every LLM parses
  natively without a schema in its prompt. JSON is reserved for machine-only files
  (manifest, lockfile). *Why:* the moment editing requires tooling, people stop
  editing, and the source of truth rots.
- **Git friendly.** Deterministic generation (same input → byte-identical output),
  stable ordering, one concern per file, no timestamps in generated output. *Why:*
  MAP's collaboration model *is* Git; anything that makes diffs noisy breaks it.
- **Offline first.** Everything except registry sync works without a network. The
  registry ships as a bundled snapshot. *Why:* CI, air-gapped enterprises, and the
  principle that your project's description must never have a runtime dependency on
  someone else's server.
- **Composable.** Rules, patterns, and profiles are packs that layer: registry pack →
  organization pack → project → path scope → personal overlay. Later layers override
  earlier ones, predictably. *Why:* real teams have real hierarchies of convention.
- **Extensible without forking.** Typed documents (`kind:`), `x-` prefixed fields,
  and plugins let anyone add capabilities without touching the spec. Unknown kinds and
  fields are preserved, never errors. *Why:* the spec must survive ideas its authors
  didn't have.
- **Portable.** A `.map/` directory is plain files: copy it, vendor it, archive it.
  No database, no daemon, no account. *Why:* portability is what makes a format
  trustworthy enough to standardize on.
- **Progressive disclosure.** A useful `.map/` can be one file; a mature one can be
  hundreds. Every feature must be adoptable independently. *Why:* standards are
  adopted at their floor, not their ceiling.

## 5. Core Concepts

```
Registry ──publishes──▶ Packs (patterns, templates, rule packs, profiles, knowledge)
                           │ map add / map init <template>
                           ▼
Project ──described by──▶ .map/ (the Description)
                           ├─ Manifest      map.config.json — identity, spec version, targets
                           ├─ Context       what the project IS (architecture, domain, stack)
                           ├─ Rules         what an agent MUST/SHOULD do, scoped to paths
                           ├─ Patterns      adopted MAP patterns (prompt + acceptance + metadata)
                           ├─ Decisions     ADRs — why things are the way they are
                           ├─ Prompts       reusable task prompts owned by the project
                           ├─ Evals         how quality is measured (golden sets, judges)
                           ├─ Agents        profiles: role + context selection + rule set
                           ├─ Memory        accumulated learnings (project vs personal)
                           └─ Workflows     multi-step procedures agents can follow
                           │ map sync (compiler + plugins)
                           ▼
Targets ──generated──▶ AGENTS.md · CLAUDE.md · .cursor/rules · copilot-instructions.md · …
```

Relationships that matter:

- A **Rule** is a constraint with `scope` (glob), `severity` (must/should/prefer), and
  provenance (which pack it came from). Rules are data, so they can be filtered,
  scoped, and compiled per target.
- An **Agent profile** is *not* a vendor. It's a role ("reviewer", "implementer",
  "docs-writer") defined as a selection of context + rules + workflows. Plugins map
  profiles onto vendor surfaces (a Claude Code subagent, a Cursor mode). *Why:* roles
  are durable; vendor features are not.
- **Memory** is split by ownership, not by topic: `memory/project/` (committed, team
  truth) and `memory/local/` (gitignored, personal). Promotion from local → project is
  a Git commit — i.e., a reviewed act. *Why:* the alternative (shared mutable memory)
  is how you get unreviewable prompt injection into your own team.
- A **Pack** is the unit of distribution (versioned, namespaced `@org/name`); a
  **Document** is the unit of authoring; a **Target** is the unit of generation.

## 6. The MAP Specification

**What is a MAP project?** Any directory containing `.map/map.config.json` with a
`specVersion`. That is the entire mandatory surface. *Why:* the floor must be one
file, or adoption stalls at "sounds heavy".

**Document format.** Every canonical document is Markdown with YAML frontmatter:

```markdown
---
kind: rule                # typed: rule | context | decision | prompt | workflow | …
id: no-raw-sql            # stable id, unique within kind
title: No raw SQL in handlers
scope: "src/api/**"       # optional glob; default: whole project
severity: must            # must | should | prefer
sync: always              # always | on-demand | never  (token budgeting hint)
x-acme-ticket: SEC-142    # x- fields: preserved, never validated
---
Use the query builder in `src/db`. Raw SQL has caused two injection incidents;
see decision 0007.
```

*Why frontmatter + prose:* the frontmatter makes documents machine-composable
(filter, scope, budget) while the body stays natural language — the actual medium
LLMs and humans share.

**Mandatory:** `map.config.json` (`specVersion`, project name). Everything else —
every directory, every document — is optional.

**Versioning.** The spec is semver, embedded as `specVersion: "1.0"`. Minor versions
are strictly additive; consumers ignore unknown kinds and fields (the HTML rule, not
the XML rule). Major versions get `map migrate` with mechanical, lossless rewrites.
Conformance levels: **MAP Core** (read manifest + context + rules, generate one
target) and **MAP Full** (all kinds, scoping, packs). *Why levels:* third parties
must be able to claim honest partial support, or they'll claim nothing.

**Compatibility.** Generated targets always carry provenance markers (see §14) with
the spec and generator versions, so any tool can detect stale or hand-edited output.
The registry document keeps its own schema version (already shipped, v1).

**Extensions.** Three sanctioned mechanisms, in escalating order: `x-` fields on any
document; custom `kind:` values under a namespace (`kind: acme/deploy-runbook`);
plugins (new sync targets, new commands). Nothing else — no hooks in the spec itself.

## 7. Directory Structure

```
.map/
  map.config.json      # manifest: specVersion, project, targets, packs (MANDATORY)
  map.lock.json        # resolved pack versions + content hashes (generated, committed)
  context/             # what the project IS: architecture.md, stack.md, domain.md
  rules/               # constraints, one per file, scoped via frontmatter
  patterns/            # adopted registry patterns (map add) — prompt, acceptance, metadata
  decisions/           # ADRs: NNNN-title.md
  prompts/             # project-owned reusable prompts
  evals/               # golden datasets, judge prompts, eval configs
  agents/              # role profiles (reviewer.md, implementer.md, …)
  workflows/           # multi-step procedures (release.md, incident.md)
  memory/
    project/           # committed team learnings
    local/             # personal; gitignored by the generated .map/.gitignore
  reports/             # analyzer output (gitignored)
  cache/               # registry cache etc. (gitignored)
```

Changes vs the current v2 workspace: `architecture/` generalizes to **`context/`**
(architecture is one kind of context; domain glossary and stack are others), and
**`rules/`**, **`workflows/`**, **`memory/`**, and **`map.lock.json`** are added.
*Why a lockfile:* packs are dependencies; teams need reproducible sync in CI exactly
like `pnpm-lock.yaml` — "works on my machine" must not apply to your AI's context.

Generated vendor files live where each vendor demands (repo root, `.github/`,
`.cursor/`) — MAP does not fight tools about their own paths.

## 8. CLI

Grouped by the job to be done (verbs users already know from git/terraform/npm):

**Author**
- `map init [template]` — scaffold `.map/` (template-based; interactive or `--yes`).
- `map add <pattern|pack>` — adopt from the registry into `.map/patterns/`.
- `map import` — **adopt-in-place**: parse an existing `CLAUDE.md`/`.cursor/rules`/
  `AGENTS.md` into canonical documents. *This command is the adoption strategy* —
  nobody starts from zero.

**Compile**
- `map sync [target…]` — generate all configured targets; deterministic.
- `map sync --check` — CI mode: exit non-zero if outputs are stale or hand-edited
  (the `terraform plan` of MAP).
- `map watch` — resync on change during development.

**Trust**
- `map validate` — schema/spec conformance of `.map/` itself.
- `map lint` — quality: contradictory rules, over-broad scopes ("everything is
  `must`"), token-budget smells, dead references.
- `map doctor` — environment + workspace + registry health (exists today; extends).
- `map status` — what changed since last sync; which targets are stale; drift.

**Understand**
- `map explain <pattern|rule|decision>` — decision-first view (exists today).
- `map inspect [--json]` — the fully resolved model: every rule with provenance and
  final scope after all layers. *Why:* composability without inspectability is
  debugging hell — this is `terraform show`.
- `map context <profile>` — print exactly what an agent with that profile receives
  (the compiled context bundle), with token counts.
- `map analyze` / `map recommend` — detect architecture, recommend missing patterns
  (exist today).

**Evolve**
- `map update` — refresh registry + update packs within semver ranges (lockfile-aware).
- `map migrate` — spec-version migrations.
- `map export` / `map import --archive` — single-file bundle for sharing/archiving.

**Ecosystem**
- `map registry search|info|publish` — registry interaction.
- `map plugins list|add|remove` — sync-target plugins.
- `map agents list|show` — profiles and their vendor mappings.
- `map serve --mcp` — serve `.map/` over MCP (see §14).

## 9. Plugin System

A plugin is a **target adapter**: it receives the *resolved model* (post-composition,
post-scoping) and emits files. It never parses `.map/` itself — the core does that
once, so N plugins can't have N interpretations. *Why:* this is the contract that
keeps the ecosystem coherent; it's Terraform's provider model.

```ts
interface SyncTarget {
  name: "claude-code" | "cursor" | …;
  detect(project): boolean;              // is this tool used here?
  plan(model, previous): TargetPlan;     // what would change (for sync --check)
  render(model): GeneratedFile[];        // deterministic
}
```

- **First-party plugins** (in the CLI repo, versioned with it): `agents-md`
  (AGENTS.md — the default, since it's the closest thing to an existing convention),
  `claude-code` (CLAUDE.md + `.claude/agents/` from profiles), `cursor`
  (`.cursor/rules` with scope translation), `copilot`
  (`.github/copilot-instructions.md`), `gemini`, `windsurf`, `aider`, `continue`,
  `openhands`.
- **Community plugins**: npm packages `map-target-<name>`, declared in
  `map.config.json`, discovered via the registry. Same interface, sandboxed to
  writing only their declared paths.
- **Degradation policy:** every plugin must render *something useful* from Core
  documents alone. A tool with rich features (Cursor's per-glob rules) gets the full
  scoped model; a tool that reads one flat file (AGENTS.md) gets a well-ordered
  compilation. Capability differences are the plugin's problem, never the author's.

## 10. Registry

Extends the shipped registry (v1, `registry.json`) from *patterns only* to **packs**:

| Pack kind | Contents | Example |
|-----------|----------|---------|
| `pattern` | prompt + acceptance + metadata (exists today) | `retrieval/chunking` |
| `template` | a starter `.map/` tree | `@map/nextjs` |
| `rules` | rule set | `@vercel/nextjs-rules`, `@acme/security-baseline` |
| `profile` | agent role definitions | `@map/reviewer` |
| `knowledge` | domain/framework context docs | `@stripe/api-knowledge` |
| `workflow` | procedures | `@map/tdd-loop` |

- **Naming:** `@org/name` namespaces from day one (npm's costliest lesson: retrofitting
  namespaces is a decade of pain). Official packs live under `@map/`.
- **Versioning:** semver; consumers pin via `map.lock.json` with content hashes.
- **Integrity:** hashes in the lockfile now; sigstore signing when the registry
  becomes a service. *Why hashes before signatures:* supply-chain integrity for
  *content that becomes prompts* is not optional — a poisoned rules pack is a prompt
  injection with a version number.
- **Distribution:** stays "static artifact over HTTPS" (GitHub releases today, a CDN
  index later) as long as physics allows. A registry *service* is a scaling decision,
  not an architecture decision.

## 11. Template Ecosystem

`map init nextjs` = `map init` + applying the `@map/nextjs` template pack: seeded
`context/stack.md`, framework rule pack reference, recommended patterns, suggested
targets. Templates are **data in the registry** (the CLI's template engine already
renders trees with variables — templates reuse it), so:

- anyone can publish `@org/template-name`; `map init @acme/service` just works;
- templates *compose*: `map init nextjs --with rag` merges two packs' documents and
  records both in the manifest (merge is per-file with conflict prompts, never magic);
- templates carry only description, never application code — MAP describes projects,
  it does not scaffold apps. *Why:* the moment templates ship code, MAP competes with
  every framework CLI and loses.

Priority templates: `nextjs`, `python`, `rag`, `monorepo`, `laravel`, `saas`,
`wordpress` — chosen by AI-assisted-development volume, not by fashion.

## 12. Project Lifecycle

- **Initialization:** `map init` (fresh) or `map import` (existing vendor files —
  the common case, and the one that must be flawless). Detection pre-fills context.
- **Development:** documents evolve in PRs like code; `map sync` locally (or a
  pre-commit hook / `map watch`); `map sync --check` + `map validate` in CI keep
  truth and artifacts locked together.
- **Maintenance:** `map update` refreshes packs within ranges; `map lint` flags rot
  (rules referencing deleted paths, stale decisions); memory promotion PRs turn
  individual learnings into team truth.
- **Scaling:** monorepos get nested `.map/` with inheritance (child overrides
  parent, same layering rules as packs); organizations publish an org pack consumed
  by every repo — change your security baseline once, roll it out by version bump.
- **Migration:** between vendors — add a plugin, `map sync`, done (that's the whole
  point); between spec versions — `map migrate`, mechanical.
- **Archiving:** `map export` produces one self-contained bundle; because everything
  is plain committed files, an archived repo needs no export at all to stay legible.

## 13. Team Collaboration

MAP deliberately has **no collaboration machinery of its own** — it rides Git.
*Why:* every mechanism Git already provides (branches, review, blame, merge) would be
worse if reinvented, and the review step is precisely what makes shared AI context
trustworthy.

- **Conflicts:** one concern per file makes most merges trivial; `map.lock.json`
  regenerates on conflict (`map update --reconcile`).
- **Shared rules:** committed in `rules/` or consumed as versioned packs. Review of a
  rule change is a normal PR review — this is a feature, not friction: a rule is a
  standing instruction to an agent with write access to your codebase; it deserves
  review.
- **Shared memory vs personal:** `memory/project/` (committed) vs `memory/local/`
  (gitignored) — see §5. Personal preferences ("I like verbose commit messages") live
  in `~/.map/` user-level overlays applied at sync time to *local* generated files
  only, never committed ones.
- **Ownership:** CODEOWNERS on `.map/rules/` and `.map/agents/` gives security teams
  a natural control point — again, plain Git.

## 14. AI Integration

Two consumption paths, deliberately layered:

1. **Compatibility path (today, always works):** generated vendor files. Every
   generated file carries provenance markers:

   ```markdown
   <!-- map:generated from .map/ v1.0 — edit .map/, then `map sync` -->
   … generated content …
   <!-- map:custom — anything below this line is preserved by sync -->
   ```

   The custom-region marker is the answer to the hardest operational problem: people
   *will* edit `CLAUDE.md` directly. Fighting that loses; sync preserves the custom
   region and `map status` nags to promote it into `.map/`. *Why:* a standard that
   requires perfect discipline fails at the first hotfix.

2. **Native path (the next decade):** `map serve --mcp` exposes the resolved model
   over MCP — resources (context docs, scoped rules for the files being edited) and
   tools (`get_rules(path)`, `search_patterns`, `record_memory`). Agents that speak
   MCP skip generated files entirely and get *live, scoped, minimal* context.

**Token economy.** Frontmatter drives compilation: `sync: always` documents go into
generated files; `sync: on-demand` documents are referenced by an index stub ("Domain
glossary available: run `map context domain`" / MCP resource link). Profiles select
subsets — a reviewer profile doesn't carry deployment workflows. `map context
<profile>` shows the exact compiled bundle with token counts, so budget is observable,
not vibes. *Why this design:* context windows grow, but cost and attention dilution
don't go away; selection beats stuffing at any window size.

**Memory evolution.** Agents may *propose* memory (`record_memory` writes to
`memory/local/`); only humans *promote* to `memory/project/` via commit. Memory
documents carry `expires`/`verify-by` hints so `map lint` can flag stale beliefs.

## 15. Future Vision (v5.0, ~5 years)

- `.map/` is in project scaffolds by default (`create-next-app` asks "Set up MAP?"),
  as `.editorconfig` is today. The question "does it have a .map?" appears in
  onboarding checklists.
- Assistants consume MAP natively over MCP; generated files remain as the long tail's
  compatibility layer. At least one major vendor documents "we read MAP" — because
  their users demanded it, not because we asked.
- The registry hosts thousands of packs; framework and platform teams (Next.js,
  Stripe, AWS) publish official knowledge/rule packs alongside their SDKs, versioned
  with their releases.
- Organizations run private registries; compliance frameworks reference MAP rule
  packs ("SOC2 AI-usage baseline") the way they reference CIS benchmarks.
- The spec is at 2.x or 3.x, governed by a neutral foundation, with a conformance
  suite and multiple independent implementations (the true test of a standard: the
  reference implementation is no longer special).
- Realistic ceiling: the standard config surface for the ~30M developers using AI
  assistants — EditorConfig-scale ubiquity, npm-scale registry, achieved by being
  boring and everywhere rather than clever and somewhere.

## 16. Risks

| Risk | Why it's real | Mitigation |
|------|---------------|------------|
| **A vendor standardizes first** (biggest) | OpenAI/Anthropic bless a format; gravity does the rest | Be the *compiler*, not a competitor: MAP generates their format on day one, so adopting MAP never conflicts with any vendor's choice. Court `AGENTS.md` explicitly — MAP is its structured backend, not its rival |
| Spec bloat | Every user's feature becomes someone's blocking need | Tiny mandatory core; RFC discipline; extensions carry the experiments; a "no" is the default answer to spec additions |
| Drift/staleness makes MAP lie | A wrong description is worse than none — agents act on it | `map sync --check` in CI, provenance markers, custom regions, `map lint` staleness checks, memory expiry |
| Nobody migrates existing config | Empty-state tools die | `map import` is a launch feature and permanently first-class |
| Supply-chain attacks via packs | Packs become prompts; prompts steer agents with commit rights | Lockfile hashes now, signing at registry-service time, `map add` diff preview, scoped plugin writes |
| Single-maintainer bus factor | Standards need perceived permanence | Public RFC process from v0.x, ≥2 maintainers before v1.0, foundation conversation at real adoption |
| Fragmentation/embrace-extend | "MAP-compatible" tools that aren't | Conformance suite + trademark policy: "MAP" requires passing tests (the OpenJS/CNCF playbook) |
| Free-rider economics | Registry/infra costs money; openness forbids tolls | Static-artifact distribution keeps costs ~zero for years; commercial layer (§20) funds the rest |
| MAP is wrong about the future | Maybe agents will read codebases so well that descriptions are redundant | Even then: *intent* (rules, decisions, evals) is not derivable from code — MAP's floor is the part that can't be inferred |

## 17. Roadmap

- **v0.1 — prove the loop** *(the current CLI is most of this)*: spec draft (Core);
  `init`, `add`, `explain`, `analyze`, `recommend`, `doctor`, `update` (shipped);
  **new:** `context/` + `rules/` kinds, `map sync` with `agents-md`, `claude-code`,
  `cursor` targets, `map sync --check`. One team must live on it.
- **v0.5 — prove adoption**: `map import` (the wedge); `copilot`, `gemini`,
  `windsurf`, `aider` targets; plugin API frozen enough for community targets; packs
  in the registry (templates, rules); lockfile; `map lint`, `map status`,
  `map inspect`.
- **v1.0 — freeze the promise**: spec 1.0 (frozen Core, additive-only minors);
  conformance suite + levels; `map migrate`; registry namespaces + hashes; profiles;
  governance formalized (RFC process, ≥2 maintainers). *v1.0 is a stability promise,
  not a feature release.*
- **v2.0 — the native path**: MCP server; scoped/live context; memory promotion
  flows; org packs + private registries; monorepo inheritance.
- **v3.0 — the ecosystem**: registry service (search, signing, analytics); official
  framework packs; second independent implementation; foundation governance if
  adoption warrants.

Priority logic: **sync before spec-completeness** (v0.1 must already solve the
N-formats pain), **import before evangelism** (v0.5 removes the adoption cliff),
**freeze before growth** (v1.0 earns trust), **native after ubiquity** (v2.0 rides
the installed base).

## 18. Comparison

| | Scope | Structure | Multi-tool | Tooling | MAP's take |
|---|---|---|---|---|---|
| **AGENTS.md** | one prose file | none | de-facto, read-only convention | none | The convention MAP *compiles to* — MAP is its structured source, adding scoping, packs, validation, and sync |
| **CLAUDE.md** | one vendor | conventions | no | vendor's | A target |
| **Cursor rules** | one vendor | globs + rules | no | vendor's | A target; its scoping validates MAP's rule model |
| **Copilot instructions** | one vendor | prose | no | vendor's | A target |
| **EditorConfig** | editor whitespace | INI keys | yes — the success template | minimal | MAP is "EditorConfig for AI context": same neutrality and floor-simplicity, bigger domain, hence real tooling |
| **Docker** | runtime packaging | Dockerfile/OCI | yes | rich | Model for "wrap what exists"; MAP packages *knowledge*, not runtimes |
| **Terraform** | infra state | HCL, providers, plan/apply | yes | rich | Model for declare-compile-check (`sync --check` = `plan`) and the provider/plugin economy |

**Why MAP is different:** every row above is either *one vendor's input* or *one flat
file*. MAP is the only design that is simultaneously vendor-neutral, structured
(scoped, typed, composable), toolable (validate/lint/diff/inspect), and
distribution-connected (registry of versioned packs) — while still degrading
gracefully to the flat files everyone already reads.

## 19. Open Source Strategy

- **License:** code MIT (unchanged); specification text CC BY 4.0 (unchanged dual
  model); *conformance suite* MIT so vendors can embed it freely. Trademark "MAP" /
  "Missing AI Patterns" reserved — the fork-the-code-not-the-name rule that keeps
  "MAP-compatible" meaningful.
- **Governance:** BDFL-with-RFCs now (honest about reality), moving to a small
  technical steering committee at ≥3 independent maintainers. RFC process as
  established by this document. Spec changes require RFC; patterns and docs don't.
- **Repos:** `map` (spec, patterns, registry — the standard), `cli` (reference
  implementation), later `conformance`. The separation already shipped and is itself
  a governance statement: the spec is not owned by an implementation.
- **Contributors:** three distinct funnels with distinct floors: pattern authors
  (Markdown only — deliberately the easiest), plugin authors (one interface), core
  (RFCs). Good-first-issue discipline on the first two.
- **Community:** GitHub Discussions as system-of-record (searchable, permanent);
  chat optional and never authoritative. Public roadmap; every "no" to a spec request
  gets a written why.
- **Sponsors/companies:** vendor contributions welcome — vendor *control* structurally
  impossible (no single-company maintainer majority, trademark held neutrally).
  Foundation (OpenJS/CNCF-style) when a major vendor wants to depend on MAP and needs
  neutrality guarantees stronger than one org's word.

## 20. Business Opportunities

Everything below sits **on top of** the standard; the spec, CLI, registry format, and
conformance suite stay free forever (the Docker/Terraform lesson: monetize operation,
not the format — and unlike them, keep the money layer out of the core repo).

| Product | What it is | Who pays |
|---|---|---|
| **MAP Cloud** | Hosted registry+: private packs, org policy distribution, SSO, audit | Teams/enterprises |
| **Team memory sync** | The one thing Git genuinely doesn't give: live shared memory with promotion queues and review UI | Teams |
| **Enterprise policy** | Compliance rule packs (SOC2/HIPAA AI baselines), fleet drift dashboards ("all 400 repos on security-baseline ≥2.1?") | Enterprises |
| **Analytics** | Which rules get overridden, which patterns correlate with fewer incidents — aggregated, opt-in | Platform teams |
| **Marketplace** | Paid expert packs (framework authors, security firms) with rev share | Pack buyers/authors |
| **Certification & training** | "MAP-certified" tools (conformance) and engineers | Vendors, individuals |
| **Hosted MCP** | `map serve` as managed infrastructure for org-wide agents | Enterprises |

Sequencing: none of this before v1.0 — premature monetization of a standard kills the
neutrality story that *is* the product.

---

## Open questions for discussion on this RFC

1. Should `context/` absorb the current `architecture/` directory in the next
   workspace major (v3), with `map migrate` handling the rename?
2. Is `agents-md` the right *default* sync target, or should default targets be
   auto-detected only?
3. Registry packs: do `rules` packs need a review/curation gate before the registry
   service exists, given the prompt-injection surface?
4. Monorepo inheritance semantics: nearest-ancestor-wins vs explicit `extends` —
   pick one before anyone depends on either.
