#!/usr/bin/env bash
# Firebase emulator suite for local play. Prefers firebase.dev-local.json (written by
# scripts/dev-local.sh) so remapped ports work; falls back to firebase.json.
set -euo pipefail
cfg="firebase.dev-local.json"
if [[ ! -f "$cfg" ]]; then
  cfg="firebase.json"
fi
exec firebase --config "$cfg" emulators:start --project demo-jetlag --only auth,firestore,storage,functions
