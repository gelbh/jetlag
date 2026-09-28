# Contributing

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
