# Changesets (Jetlag release notes)

Jetlag is a private web app. Changesets drive semver bumps and player-facing release notes. `CHANGELOG.md` syncs into the in-app What’s new feed (`src/domain/device/changelog.ts`). Never hand-edit `changelog.ts`.

## When to add a changeset

Add one on any PR that should show up in What’s new or bump the app version (player-visible fixes/features, ops-relevant version stories).

CI runs `changeset status --since` on same-repo PRs (skips `changeset-release/*`). Skip with the `skip-changeset` PR label, or add an empty changeset (`npx changeset --empty`), for deps-only, docs-only, CI-only, or pure refactors with no version story.

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
4. Merge tags `vX.Y.Z` and opens a GitHub Release. `npm run release` runs `changeset publish` (private package tags only; no npm registry) then `scripts/create-github-release.mjs`, which extracts the dated `## X.Y.Z - YYYY-MM-DD` section from `CHANGELOG.md` (the Changesets Action built-in Release body matcher only accepts undated headings). Do not run a real version bump just to experiment on a feature branch without discarding it.

Version Packages PRs opened with the default `GITHUB_TOKEN` usually skip CI. Prefer a GitHub App or PAT for the Release workflow when you want checks on that PR. Enable **Allow GitHub Actions to create and approve pull requests** in repo Actions settings.

## Scripts

- `npm run changeset` – create a changeset
- `npm run version` – apply pending changesets, normalize Fixes/Improvements/Technical, sync TS
- `npm run release` – tag private package versions and create a GitHub Release from the dated CHANGELOG section (Release workflow; no npm publish)
- `npm run release:sync` / `release:check` – sync and verify package / CHANGELOG / APP_VERSION alignment
- `npm run test:changeset-map` – section-map + normalize + release-body `node:test` suites (not collected by Vitest)
