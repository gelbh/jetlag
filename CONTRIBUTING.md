# Contributing

[![CI](https://img.shields.io/github/actions/workflow/status/gelbh/jetlag/ci.yml?branch=main&label=CI)](https://github.com/gelbh/jetlag/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://github.com/gelbh/jetlag/blob/main/package.json)
[![npm](https://img.shields.io/badge/npm-11.16.0-CB3837)](https://github.com/gelbh/jetlag/blob/main/package.json)
[![Release](https://img.shields.io/github/v/release/gelbh/jetlag?display_name=tag&sort=semver)](https://github.com/gelbh/jetlag/releases)

## Prerequisites

- Node.js `>=24` (see `package.json` `engines`)
- npm (repo pins `packageManager`)
- On Apple Silicon, Node must be native arm64 (`node -p "process.arch"` → `arm64`). A Rosetta/x64 Node installs the wrong Biome/native optional deps and breaks `npm run lint`.
- Git worktrees: run `npm ci` **inside each worktree**. Never copy or symlink `node_modules` between the main tree and a worktree.
- Prefer `npm run lint` / `npx biome` over a global `biome` so the Biome version pinned in `package.json` is used.
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) for secrets
- Optional: [`just`](https://github.com/casey/just) (`brew install just`) for maintainer recipes

CI and husky call `npm run <script>` contracts in `package.json`. Day-to-day recipes live in the root `justfile` (`just --list`).

JS/TS/CSS lint and format use Biome (`npm run lint` / `npm run format`). Stylelint is retired. BEM-style class names (`__` / `--`) are convention-only; Biome has no `selector-class-pattern` equivalent. CSS lint uses Biome recommended with intentional offs in `biome.json` for `noDescendingSpecificity`, `noImportantStyles`, and `noDuplicateProperties` (map chrome `!important` and progressive unit fallbacks). Pre-commit runs Biome on staged files (autofix); pre-push and CI run `biome ci --error-on-warnings` on the full tree.

## Setup

```bash
# confirm arch first on Apple Silicon
node -p "process.arch"   # expect: arm64

npm ci
just env-pull
# or: doppler secrets download --no-file --format env > .env.local
```

## Where do env vars go?

| Kind | Source of truth | Examples |
|------|-----------------|----------|
| Functions non-secret params (`defineString`) | `functions/.env.jet-lag-map-companion` | Stripe price IDs, `SESSION_OPS_MCP_URL`, `CF_*` |
| Functions secrets (`defineSecret`) | Google Secret Manager | `STRIPE_SECRET_KEY`, `CURSOR_API_KEY` |
| App / Worker / CI | Doppler | `VITE_*`, Worker bindings, `GCP_*`, Cloudflare deploy |

New Functions param: update the project dotenv (and a code `default` only when the prod value is stable and safe to commit). Do not mirror Functions-only params into Doppler unless another runtime needs them.

## React memoization

This app uses React Compiler in full compile mode (exclude violators with `"use no memo"`).

- Prefer the Compiler over new `useMemo` / `useCallback` / `React.memo`.
- Keep or add hand memo only for effect-dependency precision, or for domain identity contracts (see hider elimination-mask thrash work).
- Do not mass-delete existing memos until Phase 3 strip is trusted after prod soak.

## Run the app

```bash
just dev-secrets
# Doppler config `dev` → npm run dev → http://localhost:5173/
```

Emulator stack:

```bash
just emulators
# other terminal:
just dev-emulator
```

If the map geometry kernel stubs with `jetlag-geometry-kernel pkg missing`, build WASM once:

```bash
npm run wasm:build
```

Then restart Vite.

## Tests

```bash
npm test
just e2e-smoke
```

Do not add a test that another test would already fail for. Prefer one specific case over two overlapping ones.

**Delete (or do not add):** tautologies (`{children}` / title echo), duplicate predicates of the same branch, `className` forwarding, computed-style restatements of CSS, third-party passthrough with no local contract.

**Keep:** unique regressions; empty/hidden states; a11y roles and names; emulator security rules (`src/test/emulator/`); import-ban tests; auth, App Check, billing, join/role gates, timer reconcile, offline writes; local wrapper contracts (`cn` merge, GPS copy in `InlineError`, frosted vs wash float tones, MapFloatSurface `title` → Alert branch); Playwright `@smoke` wiring. Collapse extra e2e only when a unit test already owns the rule and the e2e adds no wiring check.

Coverage floors in `vitest.config.ts` (`src/domain/**`, `src/services/**`) must stay green. Do not delete emulator rules tests to shrink the suite.

## Release notes

Player-visible changes need a changeset. See [`.changeset/README.md`](.changeset/README.md). Merge into `main` requires the `changeset-status` check (or an allowed skip / empty changeset). Husky does not enforce this.

```bash
npx changeset
# or: just changeset
```
