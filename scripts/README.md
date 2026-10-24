# scripts/

Repo automation lives under eight domains. Shared helpers go in `lib/` only.

## Domains

| Domain | Role |
|--------|------|
| `build/` | Vite/dist pipeline, crawl artifacts, prerender, budgets |
| `release/` | Changelog normalize/sync, GitHub release, release check |
| `lighthouse/` | LHCI runner, preview server, route helpers |
| `geo/` | Pack geo fill, boundaries, GTFS, borders, bboxes |
| `dev/` | Local/emulator shells, geometry gates |
| `flags/` | Region flag sync (+ `flag-overrides/`) |
| `ci/` | Dependabot batch, PR title lint |
| `deploy/` | Production deploy |

`lib/` is support-only (shared spawn/helpers). Do not add product scripts there. Do not invent a ninth domain without revising `.superpowers/specs/2026-10-23-scripts-taxonomy-cleanup-design.md`.

## Naming

Basename: `<verb>-<object>` (or a single verb when the domain already names the object: `lighthouse/run.mjs`, `flags/sync.mjs`, `release/check.mjs`, `build/pipeline.mjs`).

Pack id is a CLI flag, not part of the filename:

```bash
node scripts/geo/fill-pack.mjs --pack switzerland
node scripts/geo/fill-pack.mjs --pack australia --poi-only
```

Co-located tests: `<same-basename>.test.mjs`. Shell scripts use the same rule with `.sh`.

## Contracts vs one-shots

- **Contracts:** npm / Just / CI **keys** stay stable (`build`, `dev:local`, `flags:sync`, …). Only the path after `node` / `bash` changes.
- **One-shots:** geo/GTFS/boundary tools may lack an npm key; still live under the matching domain. Do not delete them for “not on npm” without evidence (see cull rules in the design spec).
