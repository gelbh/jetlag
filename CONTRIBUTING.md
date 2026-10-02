# Contributing

[![CI](https://img.shields.io/github/actions/workflow/status/gelbh/jetlag/ci.yml?branch=main&label=CI)](https://github.com/gelbh/jetlag/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://github.com/gelbh/jetlag/blob/main/package.json)
[![npm](https://img.shields.io/badge/npm-11.16.0-CB3837)](https://github.com/gelbh/jetlag/blob/main/package.json)
[![Release](https://img.shields.io/github/v/release/gelbh/jetlag?display_name=tag&sort=semver)](https://github.com/gelbh/jetlag/releases)

## Prerequisites

- Node.js `>=24` (see `package.json` `engines`)
- npm (repo pins `packageManager`)
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) for secrets
- Optional: [`just`](https://github.com/casey/just) (`brew install just`) for maintainer recipes

CI and husky call `npm run <script>` contracts in `package.json`. Day-to-day recipes live in the root `justfile` (`just --list`).

JS/TS lint and format use Biome (`npm run lint` / `npm run format`); CSS remains Stylelint (`npm run lint:css`).

## Setup

```bash
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

This app uses React Compiler in annotation mode (`"use memo"` opt-in; expanding later).

- Prefer the Compiler over new `useMemo` / `useCallback` / `React.memo`.
- Keep or add hand memo only for effect-dependency precision, or for domain identity contracts (see hider elimination-mask thrash work).
- Do not mass-delete existing memos until full Compiler coverage is trusted.

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

## Release notes

Player-visible changes need a changeset. See [`.changeset/README.md`](.changeset/README.md).

```bash
npx changeset
# or: just changeset
```
