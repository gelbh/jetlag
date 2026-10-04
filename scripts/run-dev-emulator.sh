#!/usr/bin/env bash
# Vite via Doppler `dev_emulator`. Optional port remaps from the parent env are
# captured before doppler run, then re-applied with `env` so they win without
# --preserve-env (which would let arbitrary shell VITE_* override Doppler).
set -euo pipefail

die() {
  printf 'dev-emulator: %s\n' "$*" >&2
  exit 1
}

auth_port="${VITE_FIREBASE_AUTH_EMULATOR_PORT:-}"
firestore_port="${VITE_FIRESTORE_EMULATOR_PORT:-}"
storage_port="${VITE_FIREBASE_STORAGE_EMULATOR_PORT:-}"
functions_port="${VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT:-}"
emulator_host="${VITE_FIREBASE_EMULATOR_HOST:-}"
dev_port="${VITE_DEV_PORT:-5173}"

doppler_project() {
  local p
  p="$(awk '/^setup:/{s=1} s && /project:/{print $2; exit}' doppler.yaml 2>/dev/null || true)"
  [[ -n "$p" ]] || die "missing doppler.yaml setup.project"
  printf '%s\n' "$p"
}

proj="$(doppler_project)"
env_args=()
[[ -n "$auth_port" ]] && env_args+=("VITE_FIREBASE_AUTH_EMULATOR_PORT=${auth_port}")
[[ -n "$firestore_port" ]] && env_args+=("VITE_FIRESTORE_EMULATOR_PORT=${firestore_port}")
[[ -n "$storage_port" ]] && env_args+=("VITE_FIREBASE_STORAGE_EMULATOR_PORT=${storage_port}")
[[ -n "$functions_port" ]] && env_args+=("VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT=${functions_port}")
[[ -n "$emulator_host" ]] && env_args+=("VITE_FIREBASE_EMULATOR_HOST=${emulator_host}")

# Extra args after `--` go to vite (e.g. npm run dev:emulator -- --host).
exec doppler run --project "$proj" --config dev_emulator -- \
  env "${env_args[@]}" \
  npm run dev -- --port "$dev_port" --strictPort "$@"
