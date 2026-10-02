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

## Setup

```bash
npm ci
just env-pull
# or: doppler secrets download --no-file --format env > .env.local
```

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

## Release notes

Player-visible changes need a changeset. See [`.changeset/README.md`](.changeset/README.md).

```bash
npx changeset
# or: just changeset
```
