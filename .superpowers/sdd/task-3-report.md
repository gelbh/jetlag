# Task 3 report: Retarget docs and script headers

## Status

**Complete**

## Steps

### Step 1: Find stale references

Initial `rg` (repo default, respects `.gitignore` on `docs/`) found 5 hits:

| File | Line(s) |
|------|---------|
| `worker/README.md` | 42, 48 |
| `plugins/jetlag-live-activity/README.md` | 44, 63 |
| `scripts/run-geometry-gates.mjs` | 4 |

No hits in `package.json` for the DX grep pattern (removed names already gone from contracts in Task 2).

`docs/superpowers/` (gitignored under `docs/`) was scanned with `rg --no-ignore`: only the just-dx design/plan artifacts mention removed `npm run` names as migration notes, not separate geometry maintainer docs naming `npm run test:geometry-gates`.

### Step 2: Patches applied

- `worker/README.md`: `just preview-worker`, `just cf-typegen`
- `plugins/jetlag-live-activity/README.md`: `just cap-sync` (code block + iOS setup step)
- `scripts/run-geometry-gates.mjs`: header points at `just geometry-gates` / direct `node` invocation
- `README.md`: appended **Contributor tooling** subsection per brief
- Geometry docs under `docs/superpowers/`: no standalone geometry doc required retargeting; design/plan included in commit for coherence

### Step 3: Re-grep

Same `rg` as Step 1 over `.`: **no matches** (exit 1).

### Step 4: CI / Just

`rg -n '\bjust\b' .github/workflows`: **no matches** (exit 1).

### Step 5: Commit

```
240a8ce4 docs(dx): point maintainer recipes at just
```

Files in commit:

- `README.md`
- `worker/README.md`
- `plugins/jetlag-live-activity/README.md`
- `scripts/run-geometry-gates.mjs`
- `docs/superpowers/plans/2026-09-26-package-scripts-just-dx.md` (new, force-added)
- `docs/superpowers/specs/2026-09-26-package-scripts-just-dx-design.md` (new, force-added)

## Commits

| SHA | Message |
|-----|---------|
| `240a8ce4` | `docs(dx): point maintainer recipes at just` |

## One-line summary

Maintainer-facing READMEs and the geometry-gates script header now point at `just` recipes; root README adds a short contributor tooling note; superpowers design/plan docs tracked via `git add -f`.

## Concerns

- Root `.gitignore` ignores all of `docs/`; superpowers artifacts need `git add -f` until ignore rules are narrowed.

---

## Quality follow-up (Important findings)

Scrubbed superpowers design/plan prose:

- Replaced Unicode em-dashes in headings and mode lock line with colons.
- Set design **Status** to `design (accepted; implemented on branch chore/package-scripts-just-dx)`.
- Retargeted migration examples to `former script <name> → just …` (no `npm run` prefix on removed DX script names).

Verify (worktree):

```text
rg em-dash / prose ` -- ` on the two just-dx docs: clean except Doppler CLI `--config` lines in justfile excerpts (intentional).
rg removed DX `npm run …` names under docs/superpowers: no matches.
```

| SHA | Message |
|-----|---------|
| (this commit) | `fix(dx): scrub em-dashes and stale npm DX refs in docs` |
