# Jetlag maintainer DX. CI/husky use `npm run <contract>` in package.json.
# Install: brew install just   then: just --list

export PATH := justfile_directory() + "/node_modules/.bin:" + env_var("PATH")

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
