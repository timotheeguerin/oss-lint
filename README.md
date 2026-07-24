# oss-lint

A linter that enforces **good practices for open-source projects** — a *repo-level policy
linter* that inspects repository artifacts (lock files, `.npmrc`, `package.json`, license,
CI workflows, …) rather than source-code ASTs.

> Status: **early scaffold.** The engine and CLI plumbing exist; lint rules are not
> implemented yet. See the ADR for the architecture and roadmap.

## Goals

- **Lock-file registry validation** — fail if a lock file references a non-canonical
  registry (e.g. a forced-proxy registry committed by accident). pnpm / npm / yarn first,
  extensible to all ecosystems.
- **`.npmrc` validation** — flag non-approved `registry=` / `@scope:registry=` hosts and
  committed credentials.
- **A growing catalogue of OSS best-practice rules** (license, README, security policy,
  pinned GitHub Actions, package.json hygiene, …).

## Usage

```sh
# lint the current directory
npx oss-lint

# lint a specific directory, JSON output
npx oss-lint ./my-repo --format json
```

Exit code is non-zero when any `error`-severity diagnostic is reported.

## Development

Requires Node >= 22 and pnpm.

```sh
pnpm install
pnpm build        # tsc -> dist/
pnpm test         # vitest
pnpm lint         # oxlint
pnpm format       # oxfmt
```

### Architecture

- `src/engine` — rule engine: `RepoContext`, the `Rule` interface, and `lint()` runner.
- `src/rules` — built-in rule registry (currently empty).
- `src/reporters` — `pretty` and `json` output.
- `src/cli` — `yargs`-based CLI entry (`cmd/cli.mjs` -> `dist/cli/cli.js`).

## Documentation

- [ADR 0001 — Platform & architecture](docs/adr/0001-linter-platform.md)
