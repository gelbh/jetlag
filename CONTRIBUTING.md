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

Emulator stack (preferred):

```bash
just dev-local
# optional worktree: just dev-local <slug>
# → ~/Projects/worktrees/jetlag/<slug>
# bootstraps deps/WASM as needed, then Firebase emulators + Vite (Doppler `dev_emulator`)
# If default ports are busy, asks: kill those listeners, or bind the next free ports
# (no TTY: next free ports). Prints the Vite and Emulator UI URLs it actually bound
# Remapped stacks set VITE_FIREBASE_*_EMULATOR_PORT (+ VITE_DEV_PORT) for the client
# Functions CORS allows http://localhost|127.0.0.1:5173-5200 for shifted Vite
```

Two-terminal equivalent:

```bash
just emulators
# other terminal:
just dev-emulator
# Optional: write firebase.dev-local.json (via a prior just dev-local) then
# npm run emulators:local  # uses that config when present
```

### Expected emulator noise

`just dev-local` (especially a second stack on remapped ports) prints Firebase / Functions lines that look like failures. Most are expected for the locked emulator-only suite (`auth,firestore,storage,functions`). Map play does not need them silenced.

- **Dual suite:** Choosing new ports while another stack is up is intended. firebase-tools may warn `It seems that you are running multiple instances of the emulator suite for project demo-jetlag`. The launcher also prints `dev-local: second emulator suite is expected on new ports; prefer kill for a quiet single stack`.
- **Eventarc / Tasks:** Functions v2 late-starts these sidecars even when `--only` omits them. The launcher pins `emulators.eventarc` / `emulators.tasks` in generated `firebase.dev-local.json`, so you should not see `unable to start on port 9299` / `9499` hop spam unless something outside the map holds the port.
- **ADC:** `Application Default Credentials detected. Non-emulated services will access production using these credentials.` is expected when ADC is present. Do not strip credentials to silence it. Not required to fix for map play.
- **GSM 403 / secrets:** Without `functions/.secret.local`, the Functions emulator may call Google Secret Manager for `demo-jetlag` and log `Unable to access secret environment variables from Google Cloud Secret Manager` (often 403). Optional `functions/.secret.local` overrides quiet that (follow-up: committed `functions/.secret.local.example`; copy, do not commit the real file). Not required for map play. The launcher does not auto-create it.
- **Schedulers ignored:** `function ignored because the pubsub emulator does not exist or is not running` is expected (`--only` has no Pub/Sub). That is OK for map play. Starting Pub/Sub still does not auto-run cron; invoke via `functions:shell` or a manual publish if you need a scheduled handler.
- **Trigger chatter:** Firestore triggers (capture, finalize, warm preload, and similar) log real work. Two suites double the volume. Prefer kill-defaults at the busy-port prompt for a quiet single stack.

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

## Release notes

Player-visible changes need a changeset. See [`.changeset/README.md`](.changeset/README.md). Merge into `main` requires the `changeset-status` check (or an allowed skip / empty changeset). Husky does not enforce this.

```bash
npx changeset
# or: just changeset
```
