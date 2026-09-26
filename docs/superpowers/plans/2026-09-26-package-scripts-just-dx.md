# Package scripts Just DX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split root scripts into npm contracts (CI/husky/lifecycle) and Just recipes (human DX), without teaching CI to call Just.

**Architecture:** Keep ~22 stable `package.json` script names that `.github/`, `.husky/`, Playwright, and CodeRabbit already call. Move Doppler/Cap/worker/watch/UI/geometry-gates/overpass/emulators/changeset aliases into a root `justfile`. Just recipes that need shared work call `npm run <contract>` or `node scripts/…`.

**Tech Stack:** Just (`justfile`), existing npm scripts, Node orchestrators under `scripts/`.

**Spec:** `docs/superpowers/specs/2026-09-26-package-scripts-just-dx-design.md`

## Global Constraints

- Approach C + Just only (mise/nx/turbo deferred).
- CI stays on `npm run …`; no Just install in workflows.
- Do not add `just` as an npm dependency.
- Single-line conventional commits: `type(scope): description` (no body).
- Do not shrink the real CI test/deploy matrix in this PR.
- No em-dashes in new prose.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `justfile` (create) | Human DX recipes; header points at npm contracts |
| `package.json` | Remove DX scripts; leave contracts |
| `README.md` | One short contributor note: install Just + `just --list` |
| `worker/README.md` | `just preview-worker` / `just cf-typegen` |
| `plugins/jetlag-live-activity/README.md` | `just cap-sync` |
| `scripts/run-geometry-gates.mjs` | Header comment → Just / node path |
| Geometry docs under `docs/superpowers/` that name `npm run test:geometry-gates` | Retarget to `just geometry-gates` |

Projected footprint: ~8 files, well under jumbo thresholds. Single PR.

---

### Task 1: Inventory contracts, then add `justfile`

**Files:**
- Create: `justfile`
- Modify: none yet (inventory only informs Task 2)

**Interfaces:**
- Consumes: current `package.json` scripts + grep of `.github/workflows`, `.husky`, `playwright.config.ts`, `.coderabbit.yaml`
- Produces: root `justfile` with every DX recipe from the spec table

- [ ] **Step 1: Confirm contract set via grep**

Run:

```bash
rg -n 'npm run [a-z0-9:_-]+' .github/workflows .husky playwright.config.ts .coderabbit.yaml
```

Expected: every name appears in the spec Layer 1 keep-list (`prepare`, `version`, `dev`, `preview`, `wasm:build`, `build`, `tokens:build`, `lint`, `lint:css`, `lint:pr-title`, `typecheck`, `test`, `test:coverage`, `test:changed`, `test:functions`, `test:emulator`, `test:emulator:vitest`, `test:e2e`, `test:e2e:gate-smoke`, `test:e2e:layout-deep`, `test:perf`, `test:lighthouse`, `release:check`, `release:sync`, `deploy`). If grep finds an extra name, keep it in `package.json` and do not move it to Just.

- [ ] **Step 2: Create `justfile`**

Create `justfile` at repo root with this content (adjust only if Step 1 forced an extra keep):

```just
# Jetlag maintainer DX. CI/husky use `npm run <contract>` in package.json.
# Install: brew install just   then: just --list

# --- env / dev ---

env-pull:
  doppler secrets download --no-file --format env > .env.local

dev-secrets:
  doppler run --config dev -- npm run dev

dev-emulator:
  doppler run --config dev_emulator -- npm run dev

build-secrets:
  doppler run --config prd -- npm run build

# --- test DX ---

test-watch:
  vitest --project unit

e2e-smoke:
  E2E_SMOKE=1 npm run test:e2e

e2e-ui:
  playwright test --ui

geometry-gates:
  node scripts/run-geometry-gates.mjs

audit-overpass:
  RUN_OVERPASS_AUDIT=1 vitest run --project unit src/services/core/overpassAudit.integration.test.ts

emulators:
  firebase emulators:start --project demo-jetlag --only auth,firestore,storage,functions

# --- worker / cap ---

deploy-worker:
  npm run build && wrangler deploy

preview-worker:
  npm run build && wrangler dev

cf-typegen:
  wrangler types --env-file .dev.vars.example

cap-sync:
  npm run build && npx cap sync

cap-android: cap-sync
  npx cap open android

cap-ios: cap-sync
  npx cap open ios

# --- release helpers ---

changeset:
  npx changeset
```

Note: `cap-android` / `cap-ios` use Just dependency syntax (`cap-sync` before the body). On Just, a recipe name as a dependency runs first.

- [ ] **Step 3: Smoke `just --list`**

Run: `just --list`

Expected: lists `env-pull`, `dev-secrets`, `dev-emulator`, `build-secrets`, `test-watch`, `e2e-smoke`, `e2e-ui`, `geometry-gates`, `audit-overpass`, `emulators`, `deploy-worker`, `preview-worker`, `cf-typegen`, `cap-sync`, `cap-android`, `cap-ios`, `changeset`.

If `just` is missing: install via `brew install just`, then re-run. Do not add an npm dependency.

- [ ] **Step 4: Commit**

```bash
git add justfile
git commit -m "chore(dx): add justfile for maintainer recipes"
```

---

### Task 2: Prune DX scripts from `package.json`

**Files:**
- Modify: `package.json` (scripts block only)

**Interfaces:**
- Consumes: Task 1 `justfile` recipes covering removed names
- Produces: `package.json` scripts = contracts only

- [ ] **Step 1: Remove DX entries from `scripts`**

Delete these keys from `package.json` `"scripts"` (exact names):

`env:pull`, `dev:secrets`, `dev:emulator`, `build:secrets`, `test:watch`, `test:e2e:smoke`, `test:e2e:ui`, `test:geometry-gates`, `audit:overpass`, `emulators:start`, `deploy:worker`, `preview:worker`, `cf-typegen`, `cap:sync`, `cap:android`, `cap:ios`, `changeset`

Keep every Layer 1 contract from the spec (including `release:sync`).

Do not touch `dependencies` / `devDependencies` / lockfile in this task.

- [ ] **Step 2: Assert removals + contract grep**

Run:

```bash
node -e '
const s = require("./package.json").scripts;
const removed = ["env:pull","dev:secrets","dev:emulator","build:secrets","test:watch","test:e2e:smoke","test:e2e:ui","test:geometry-gates","audit:overpass","emulators:start","deploy:worker","preview:worker","cf-typegen","cap:sync","cap:android","cap:ios","changeset"];
const still = removed.filter((k) => k in s);
if (still.length) { console.error("still present:", still); process.exit(1); }
const required = ["prepare","version","dev","preview","wasm:build","build","tokens:build","lint","lint:css","lint:pr-title","typecheck","test","test:coverage","test:changed","test:functions","test:emulator","test:emulator:vitest","test:e2e","test:e2e:gate-smoke","test:e2e:layout-deep","test:perf","test:lighthouse","release:check","release:sync","deploy"];
const missing = required.filter((k) => !(k in s));
if (missing.length) { console.error("missing contracts:", missing); process.exit(1); }
console.log("ok", Object.keys(s).length, "scripts");
'
```

Expected: `ok` and a count around 22–25.

Also re-run:

```bash
rg -n 'npm run [a-z0-9:_-]+' .github/workflows .husky playwright.config.ts .coderabbit.yaml
```

Expected: every referenced name still exists in `package.json` scripts.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(dx): keep package.json scripts as CI contracts"
```

---

### Task 3: Retarget docs and script headers

**Files:**
- Modify: `README.md`
- Modify: `worker/README.md`
- Modify: `plugins/jetlag-live-activity/README.md`
- Modify: `scripts/run-geometry-gates.mjs` (header comment only)
- Modify: geometry docs that still say `npm run test:geometry-gates` (grep-driven list)

**Interfaces:**
- Consumes: Just recipe names from Task 1
- Produces: no stale `npm run` for removed DX names in touched docs

- [ ] **Step 1: Find stale references**

Run:

```bash
rg -n 'npm run (env:pull|dev:secrets|dev:emulator|build:secrets|test:watch|test:e2e:smoke|test:e2e:ui|test:geometry-gates|audit:overpass|emulators:start|deploy:worker|preview:worker|cf-typegen|cap:sync|cap:android|cap:ios|changeset)\b' .
```

Expected: hits in docs / comments only (not `package.json`). Update each hit in this task.

- [ ] **Step 2: Patch known call sites**

`worker/README.md`:

- `npm run preview:worker` → `just preview-worker`
- `npm run cf-typegen` → `just cf-typegen`

`plugins/jetlag-live-activity/README.md`:

- `npm run cap:sync` → `just cap-sync` (both occurrences)

`scripts/run-geometry-gates.mjs` header:

```js
/**
 * Geometry WASM parity + perf gates.
 * Invoked by `just geometry-gates` (or `node scripts/run-geometry-gates.mjs`).
 */
```

`README.md`: after the marketing blurb section (before or after “How it works”), add a minimal contributor subsection only if it fits without bloating the landing page. Prefer appending near the end of the file:

```markdown
## Contributor tooling

CI and hooks use `npm run <script>` contracts in `package.json`. Day-to-day maintainer recipes live in the root `justfile` (`brew install just`, then `just --list`).
```

Geometry docs: replace `npm run test:geometry-gates` with `just geometry-gates` wherever Step 1 found them under `docs/superpowers/`.

- [ ] **Step 3: Re-grep stale npm DX names**

Run the same `rg` as Step 1.

Expected: no matches in tracked source/docs (ignore agent transcripts / unrelated caches). `package-lock.json` should not match.

- [ ] **Step 4: Confirm CI still has no Just**

Run:

```bash
rg -n '\bjust\b' .github/workflows
```

Expected: no matches (or only unrelated English “just”). No workflow installs Just.

- [ ] **Step 5: Commit**

```bash
git add README.md worker/README.md plugins/jetlag-live-activity/README.md scripts/run-geometry-gates.mjs docs/superpowers
git commit -m "docs(dx): point maintainer recipes at just"
```

---

### Task 4: Final verify

**Files:** none (verification only)

- [ ] **Step 1: Contract + removal assert**

Re-run the `node -e` script from Task 2 Step 2. Expected: `ok`.

- [ ] **Step 2: `just --list` + one `--show`**

```bash
just --list
just --show cf-typegen
```

Expected: recipe list includes moved DX names; `cf-typegen` body shows `wrangler types --env-file .dev.vars.example`.

- [ ] **Step 3: Done checklist against spec Verify**

Spec Verify 1–5 all green (grep contracts, removals absent, just list, docs clean, no CI Just).

No further commit unless verify forced a fix; if a fix is needed, commit with `fix(dx): …` single-line subject.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Just DX tool lock | Task 1 |
| package.json contracts only | Task 2 |
| Move listed DX scripts | Tasks 1–2 |
| Docs / geometry header / CodeRabbit keeps npm `release:sync` | Task 3 (+ `release:sync` kept in Task 2) |
| No CI Just | Task 3 Step 4 + Task 4 |
| Verify grep / node / just --list | Tasks 2–4 |

No placeholders. Commit messages are single-line conventional subjects per Bounce husky shape.
