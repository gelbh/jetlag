# Changesets (Jetlag release notes)

Jetlag is a private web app. Changesets drive semver bumps and player-facing release notes. `CHANGELOG.md` syncs into the in-app What’s new feed (`src/domain/device/changelog.ts`). Never hand-edit `changelog.ts`.

## When to add a changeset

Add one on any PR that should show up in What’s new or bump the app version (player-visible fixes/features, ops-relevant version stories).

Skip with the `skip-changeset` PR label, or add an empty changeset (`npx changeset --empty`), for deps-only, docs-only, CI-only, or pure refactors with no version story.

## How to add

```bash
npx changeset
```

Pick `jetlag`, choose patch / minor / major, then write one bullet per line in the summary.

## Bullet prefixes (required for sectioning)

| Prefix | In-app section |
|--------|----------------|
| `fix:` | Fixes |
| `improve:` or `improvement:` | Improvements |
| `tech:` or `technical:` | Technical |

Unprefixed lines default to **Technical** on patch-only bumps and **Improvements** on minor/major.

Example:

```md
---
"jetlag": patch
---

fix: Measuring shade stays after confirm when the region is too large to store
improve: Full-bleed hunt tool deck spacing
tech: Tighten release:check version alignment
```

## Version Packages flow

1. Feature PRs merge to `main` with pending `.changeset/*.md` files.
2. The release workflow opens/updates a **Version Packages** PR (`changeset version` → normalize sections → sync `changelog.ts`).
3. Humans review `CHANGELOG.md` + version bump, then merge.
4. Merge creates `vX.Y.Z` and a GitHub Release (R2). Do not run a real version bump just to experiment on a feature branch without discarding it.

## Scripts

- `npm run changeset` – create a changeset
- `npm run version` – apply pending changesets, normalize Fixes/Improvements/Technical, sync TS
- `npm run release:sync` / `release:check` – sync and verify package / CHANGELOG / APP_VERSION alignment
- `npm run test:changeset-map` – run the section-map `node:test` suite (not collected by Vitest)
