# Package scripts contract + Just DX (Approach C)

**Date:** 2026-09-26  
**Status:** design (accepted; implemented on branch chore/package-scripts-just-dx)  
**Work kind:** personal (no Jira)  
**Mode lock:** Approach **C**: human DX via Just; `package.json` scripts = contracts only  
**DX tool lock:** **Just** (`justfile`), not mise (mise deferred; Node/`packageManager` already pin the toolchain)  
**Prior art:** `c51b857e` package.json hygiene (orchestrators + prune); `#567` vitest/stylelint script retargets  
**Scope upgrade:** earlier “delete ~8 thin aliases” → durable two-layer catalog (npm contracts + Just recipes)

## Problem

Root `package.json` holds ~42 scripts that mix three jobs: npm lifecycle, CI/husky contracts, and human cookbook aliases (Doppler wrappers, Cap open, Playwright UI, overpass audit, …). The Aug hygiene pass moved heavy orchestration into `scripts/*.mjs` but left the menu fat. Humans and CI share one namespace, so every convenience alias looks like a public API.

## Users + JTBD

- **CI / husky / Playwright / CodeRabbit:** call stable `npm run <name>` names that do not churn for DX taste.
- **Maintainer on a laptop:** discover and run day-to-day recipes (`just --list`) without scrolling `package.json`.
- **Future agent / doc author:** know which layer to update (contract vs DX) without inventing a third runner.

## Locked decisions

| Lock | Choice |
|------|--------|
| Approach | **C** |
| Human DX tool | **Just** + root `justfile` (system binary; document install; not an npm dependency) |
| Deferred | mise tasks, nx, turbo, moon, wireit |
| `package.json` role | **Contracts only:** lifecycle, CI, husky, Playwright `webServer`, CodeRabbit-referenced names |
| Just role | **DX only:** Doppler/env, Cap, worker preview/typegen, watch/UI e2e, geometry gates, overpass, emulators, changeset helpers |
| Single source for shared work | Just recipes that need a contract **call `npm run <contract>`** (or `node scripts/…` already owned by a contract). Do not duplicate long command lines in both places. |
| CI | Stays on `npm run …` only. Runners do **not** install Just. |
| Non-goals | Shrinking the real test/deploy matrix; changing orchestrator internals (`run-build.mjs`, etc.); monorepo task graph; moving secrets into Just beyond today’s Doppler one-liners |

## Approaches considered

| | Approach | Trade-off |
|---|----------|-----------|
| A | Thin alias prune only | Small diff; menu stays fat |
| B | Contracts in npm + docs for DX | No new tool; DX discoverability weaker |
| **C (pick)** | Contracts in npm + Just DX | Best long-term menu split; requires Just on maintainer machines |

## Design

### Layer 1: keep in `package.json` (contracts)

Keep (names stable; CI/husky/Playwright/CodeRabbit may call them):

| Script | Why contract |
|--------|----------------|
| `prepare` | npm lifecycle → husky |
| `version` | changesets / release path |
| `dev`, `preview` | Playwright `webServer` |
| `wasm:build`, `build`, `tokens:build` | build / CI |
| `lint`, `lint:css`, `lint:pr-title`, `typecheck` | CI + husky |
| `test`, `test:coverage`, `test:changed` | CI + husky |
| `test:functions`, `test:emulator`, `test:emulator:vitest` | CI |
| `test:e2e`, `test:e2e:gate-smoke`, `test:e2e:layout-deep` | CI workflows |
| `test:perf`, `test:lighthouse` | CI |
| `release:check`, `release:sync` | CI + CodeRabbit |
| `deploy` | deploy workflow |

Rough target: ~22 scripts (down from 42). Exact set confirmed at implement time by grepping `.github/`, `.husky/`, `playwright.config.ts`, `.coderabbit.yaml`.

### Layer 2: move to `justfile` (DX)

Remove from `package.json` and re-home as Just recipes (kebab-case recipe names; comments group sections):

| Former npm script | Just recipe (proposed) | Implementation |
|-------------------|------------------------|----------------|
| `env:pull` | `env-pull` | same Doppler download one-liner |
| `dev:secrets` | `dev-secrets` | `doppler run --config dev -- npm run dev` |
| `dev:emulator` | `dev-emulator` | `doppler run --config dev_emulator -- npm run dev` |
| `build:secrets` | `build-secrets` | `doppler run --config prd -- npm run build` |
| `test:watch` | `test-watch` | `vitest --project unit` (watch mode; not `vitest run`) |
| `test:e2e:smoke` | `e2e-smoke` | `E2E_SMOKE=1 npm run test:e2e` |
| `test:e2e:ui` | `e2e-ui` | `playwright test --ui` |
| `test:geometry-gates` | `geometry-gates` | `node scripts/run-geometry-gates.mjs` |
| `audit:overpass` | `audit-overpass` | same env + vitest path |
| `emulators:start` | `emulators` | same firebase emulators:start |
| `deploy:worker` | `deploy-worker` | `npm run build && wrangler deploy` |
| `preview:worker` | `preview-worker` | `npm run build && wrangler dev` |
| `cf-typegen` | `cf-typegen` | same wrangler types line |
| `cap:sync` | `cap-sync` | `npm run build && npx cap sync` |
| `cap:android` | `cap-android` | `just cap-sync` then open android |
| `cap:ios` | `cap-ios` | `just cap-sync` then open ios |
| `changeset` | `changeset` | `npx changeset` |

Optional convenience recipes (not former scripts): `just --list` is the menu; a short header comment points maintainers at `npm run` for CI contracts.

### Docs + references

Update call sites that named removed scripts:

- `worker/README.md` → `just preview-worker` / `just cf-typegen`
- `plugins/jetlag-live-activity/README.md` → `just cap-sync`
- Geometry plans/specs that still name former script `test:geometry-gates` → `just geometry-gates` (or “`just geometry-gates` / `node scripts/run-geometry-gates.mjs`”)
- `scripts/run-geometry-gates.mjs` header comment
- Root `README.md` only if it documents scripts today (currently does not); add a one-line “Install Just; `just --list` for DX” if a contributor section exists or is added minimally

Keep `.coderabbit.yaml` on `npm run release:sync` (contract retained).

### Install / contributor expectation

- Document: install Just via Homebrew (`brew install just`) or the official installer; `just --version` smoke.
- Do **not** add `just` as an npm package or CI apt step.
- Agents and humans without Just still run contracts via `npm run` and can invoke `node scripts/…` directly for moved one-offs.

### Orchestrators

Unchanged. `build` still → `scripts/run-build.mjs`; lighthouse / geometry-gates stay Node entrypoints. Just only re-labels the human path to geometry-gates.

## Verify (prove-repo: jetlag)

1. Grep: every `npm run …` in `.github/workflows`, `.husky`, `playwright.config.ts`, `.coderabbit.yaml` resolves to a remaining `package.json` script.
2. `node -e` assert: removed DX names are absent from `package.json` scripts.
3. `just --list` (local) lists the moved recipes; spot-check `just cf-typegen --dry-run` or equivalent recipe dry-run if available; otherwise `just --show cf-typegen` shows the wrangler line.
4. Docs grep: no stale maintainer invocations for removed DX names (e.g. former scripts `cap:sync`, `preview:worker`, `test:geometry-gates`) in tracked README/spec paths touched by the PR (or updated in-PR).
5. No CI workflow gains a Just install step.

## Challenge lenses

- **jevons:** one `justfile` + delete aliases + doc retargets; no monorepo runner.
- **tests:** no new product tests; verify is grep + local `just --list`.
- **security:** Doppler stays explicit in Just recipes; no new secret files.
- **edges:** contributors without Just use `npm run` contracts + raw commands; CodeRabbit keeps npm; Windows Just users get the same recipes (Just is cross-platform).

## Out of scope / follow-ups

- Adopting mise for tool versions or tasks later (only if Just + engines prove insufficient).
- Teaching CI to call Just (explicitly rejected).
- Further collapsing CI contract names themselves (separate change; needs workflow edits as the point of the change).
