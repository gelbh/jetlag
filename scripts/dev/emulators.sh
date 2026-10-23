#!/usr/bin/env bash
# Firebase emulator suite for local play. Use firebase.dev-local.json only when
# the launcher (or the caller) exported remap ports; otherwise firebase.json so
# a leftover remap file cannot split-brain two-terminal Vite on defaults.
set -euo pipefail
cfg="firebase.json"
if [[ -f firebase.dev-local.json && -n "${VITE_FIREBASE_AUTH_EMULATOR_PORT:-}" ]]; then
  cfg="firebase.dev-local.json"
fi
exec firebase --config "$cfg" emulators:start --project demo-jetlag --only auth,firestore,storage,functions
