# ADR 0001 — Platform & architecture for `oss-lint`

- **Status:** Proposed
- **Date:** 2026-07-24
- **Deciders:** @timotheeguerin
- **Supersedes:** —

## Context

`oss-lint` is a new linter that enforces **good practices for open-source projects**. It
is a *repo-level policy linter*: its rules inspect repository artifacts (lock files,
`.npmrc`, `package.json`, `LICENSE`, CI workflows, etc.) rather than JS/TS source ASTs.

### Motivating use cases (initial)

1. **Lock-file registry-URL validation** — fail if a lock file references a non-canonical
   registry (e.g. a corporate/forced-proxy registry accidentally committed). Must cover
   **pnpm, npm, yarn** first, and be extensible to all ecosystems.
2. **`.npmrc` validation** — fail if `.npmrc` (repo or nested) points `registry=` /
   `@scope:registry=` at a non-approved host, or embeds credentials / `_authToken`.
3. **A broad, growing catalogue of OSS best-practice rules** (LICENSE present & SPDX-valid,
   README/CODE_OF_CONDUCT/SECURITY.md present, GitHub Actions pinned to SHAs,
   `package.json` metadata hygiene, no secrets in committed files, etc.).

The tool must be a good OSS citizen itself: `npx`-friendly single Node CLI, typed config,
machine-readable output (JSON/SARIF for CI), and a low-friction way to add new rules.

## Decision drivers (evaluation criteria)

| # | Criterion | Why it matters |
|---|-----------|----------------|
| C1 | **Rule model fit** — operate on repo artifacts, not source ASTs | Core of what oss-lint does |
| C2 | **Multi-ecosystem lockfile support** (pnpm/npm/yarn now; extensible) | Primary requirement |
| C3 | **Extensibility** — cheap to add rules; clear rule/plugin API | Catalogue will grow continuously |
| C4 | **Config** — typed, per-rule options, allow/deny lists | Registries/hosts must be configurable |
| C5 | **Distribution & CI** — single Node CLI, non-zero exit, JSON/SARIF | Runs in every repo's CI |
| C6 | **Autofix capability** | Nice-to-have for e.g. `.npmrc` fixes |
| C7 | **Maintenance/ownership** — control + matches my conventions | Long-lived, self-owned tool |
| C8 | **Reuse** — leverage existing tools/infra vs reinvent | Avoid wasted effort |

## Findings

### F1 — Registry URLs are encoded differently per lock-file format

Verified against real lock files in the workspace:

| Format | Registry-URL location | Example |
|--------|----------------------|---------|
| `package-lock.json` (v1/v2/v3) | per-package `"resolved"` URL | `https://registry.npmjs.org/<pkg>/-/<pkg>-x.y.z.tgz` |
| `yarn.lock` (classic v1) | `resolved "<url>#hash"` lines | `https://registry.yarnpkg.com/<pkg>/-/...tgz#<sha>` |
| `yarn` berry (v2+) | `resolution:` + `__metadata`, cache keys | differs from v1 |
| `pnpm-lock.yaml` (v9) | **default registry → only `resolution: {integrity}` (no URL)**; non-default registry → `resolution: {tarball: 'https://...'}` | proxy leak shows up as `tarball:` host |

**Implication:** a registry-URL rule needs **format-specific parsers**; there is no single
"resolved URL" field. The pnpm case (URL only appears for non-default registries) is
exactly the proxy-leak signal we care about, and it is the hardest to get from third parties.

### F2 — `lockfile-lint` covers only npm + yarn, not pnpm

`lockfile-lint` (lirantal) validates allowed registries/hosts/protocols for
`package-lock.json`/`npm-shrinkwrap.json` and `yarn.lock`, but **does not support
`pnpm-lock.yaml`** (upstream position: pnpm doesn't retain tarball sources for the default
registry). Since pnpm is my primary package manager, the tool's headline use case is a
**gap** in the most obvious off-the-shelf option. Its validation approach is still a good
reference to borrow.

### F3 — `repolinter` (TODO Group) is light-maintenance, JS, ruleset-oriented

`repolinter` targets exactly "OSS repo best practices" (LICENSE/README/etc.) via
JSON/YAML rulesets, but is in light maintenance, JS (not TS-first), and its file-existence
/ regex ruleset model does not fit structured lock-file/`.npmrc` parsing rules well.

### F4 — `chronus` gives me a proven, reusable foundation

My own `chronus` repo already establishes the conventions and much of the plumbing:
ESM pnpm-workspace monorepo; `yargs` CLI; `zod` config; `vitest`; `oxlint`/`oxfmt`; pnpm
catalog; Node ≥22; **and a multi-ecosystem plugin pattern** under `workspace-manager/`
(`node` [pnpm/rush], `rust` [cargo], `python` [pip]) with a shared file/reporter layer.
That per-ecosystem abstraction is the same shape oss-lint needs for per-format lock parsers.

## Options considered

### P1 — Standalone TS CLI + custom rule engine (chronus-style) ✅ recommended
Own rule/plugin engine over a shared "repo context" (file access + parsed artifacts),
`yargs` CLI, `zod` config, per-ecosystem parsers, JSON/SARIF + pretty reporters.

- **C1** ✅ purpose-built for repo-artifact rules. **C2** ✅ per-format parser plugins,
  including native pnpm `tarball:` detection. **C3** ✅ first-class rule API. **C4** ✅
  zod per-rule options. **C5** ✅ single Node CLI. **C6** ✅ can design fix hooks.
  **C7** ✅ fully owned, matches chronus. **C8** ✅ reuse chronus patterns; borrow
  lockfile-lint logic.
- **Cons:** we build the engine (rule registry, reporters, config resolution). Mitigated by
  reusing chronus scaffolding and the small surface area.

### P2 — ESLint plugin / flat-config ecosystem ❌
ESLint is AST- and file-scoped for JS/TS source. Modeling "the pnpm lock file's tarball
hosts" or cross-file repo policies is awkward/against the grain.
- **C1** ❌ **C2** ❌ **C3** ⚠️ (rules exist but wrong unit) → **reject**.

### P3 — Extend `repolinter` ❌
Right problem domain, wrong foundation: light maintenance, JS, ruleset/regex model unsuited
to structured lock/`.npmrc` parsing; I'd fight the framework and inherit its stack.
- **C1** ✅ **C3** ⚠️ **C7** ❌ **C2** ❌ → **reject** as a base (mine ideas only).

### P4 — Aggregator (MegaLinter / Super-linter) + custom rules ❌
Heavyweight (Docker), designed to orchestrate many existing linters. Adding structured
custom rules is clunky and the footprint is wrong for an `npx` dev tool.
- **C3** ⚠️ **C5** ❌ **C7** ❌ → **reject**.

### P5 — Thin orchestrator over point tools (`lockfile-lint`, `publint`, …) ❌ (as the base)
Wrap existing tools behind one CLI/config.
- **C2** ❌ (no pnpm via lockfile-lint — the headline gap), **C3** ❌ (heterogeneous
  configs, no uniform rule model), inconsistent reporting. Useful only to *borrow logic*,
  not as the platform. → **reject** as the base.

## Decision

Adopt **P1: build `oss-lint` as a standalone TypeScript CLI with a custom, extensible
rule engine**, following chronus conventions (ESM pnpm monorepo, `yargs`, `zod`, `vitest`,
`oxlint`/`oxfmt`, pnpm catalog, Node ≥22).

For the lock-file registry rule, **implement native per-format parsing** (pnpm/npm/yarn)
so pnpm is covered uniformly; borrow `lockfile-lint`'s allow/deny validation approach
rather than depending on it.

## Architecture sketch (recommended, not yet built)

```
oss-lint (CLI, yargs)
  └─ engine
       ├─ RepoContext        # cwd, file read/glob, cached parsed artifacts
       ├─ Rule registry      # id, meta, schema (zod), check(ctx) -> Diagnostic[]
       ├─ Config resolver    # oss-lint.config.* + per-rule options, allow/deny lists
       ├─ Reporters          # pretty | json | sarif ; exit code from severities
       └─ parsers/           # per-artifact, per-ecosystem
            ├─ lockfiles/ (pnpm | npm | yarn ; -> normalized {name, host, url})
            └─ npmrc/ , packageJson/ , workflows/ ...
  rules/
    ├─ lockfile-registry-allowed     # C1 use case (all ecosystems)
    ├─ npmrc-registry-allowed        # .npmrc registry/@scope:registry hosts
    ├─ npmrc-no-credentials          # no _authToken/_password committed
    └─ … (license-present, readme-present, security-md, actions-pin-sha, …)
```

- **Rule API:** each rule = `{ id, description, schema, severity, check(ctx, options), fix? }`.
  Rules are pure over `RepoContext`; parsing is shared/cached so many rules reuse one parse.
- **Normalization:** lock parsers emit a uniform `{ packageName, resolvedHost, resolvedUrl,
  location }` so the registry rule is ecosystem-agnostic; only parsers are per-format.
- **Config:** `oss-lint.config.ts|json` with `zod` schema; global `allowedRegistries`
  plus per-rule overrides; presets (e.g. `recommended`).

## Consequences

- **Positive:** full control and consistency with my stack; covers the pnpm gap others
  miss; a single rule API scales to the whole OSS best-practice catalogue; clean CI
  output (SARIF). Reuses chronus patterns to reduce build cost.
- **Negative / costs:** we own the engine (registry, config, reporters) and per-format
  parsers, plus their maintenance as lock formats evolve (pnpm v6/v9, yarn v1/berry,
  npm v1/2/3).
- **Risks / mitigations:** lock-format drift → isolate in `parsers/` with fixture tests
  per format/version; scope creep in the rule catalogue → ship a small `recommended`
  preset first, add rules incrementally behind config.

## Next steps (follow-up phases, not this ADR)

1. Decide repo shape (standalone monorepo vs single package) & scaffold `oss-lint/` per
   chronus conventions.
2. Implement the engine core (RepoContext, rule registry, config, reporters).
3. Implement lock parsers (pnpm/npm/yarn) + `lockfile-registry-allowed` rule with fixtures.
4. Implement `.npmrc` rules.
5. Grow the OSS best-practice rule catalogue + `recommended` preset.
