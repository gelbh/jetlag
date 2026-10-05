#!/usr/bin/env bash
# One-command local emulator stack: bootstrap + Firebase emulators + Vite (dev_emulator).
# Usage: scripts/dev-local.sh [worktree-slug]
#   slug → $HOME/Projects/worktrees/jetlag/<slug>
#   no arg → current jetlag checkout (git toplevel)
set -euo pipefail

die() {
  printf 'dev-local: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

is_jetlag_root() {
  local dir="$1"
  [[ -f "$dir/package.json" ]] || return 1
  node -e 'const p=require("./package.json"); process.exit(p.name==="jetlag"?0:1)' >/dev/null 2>&1
}

resolve_root() {
  local slug="${1:-}"
  local root
  if [[ -n "$slug" ]]; then
    [[ "$slug" != */* && "$slug" != .* && "$slug" != *..* ]] || die "slug must be a single path segment (got: $slug)"
    root="${HOME}/Projects/worktrees/jetlag/${slug}"
    [[ -d "$root" ]] || die "worktree not found: $root"
  else
    root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  fi
  (cd "$root" && is_jetlag_root "$root") || die "not a jetlag checkout: $root"
  printf '%s\n' "$root"
}

node_major() {
  local ver
  ver="$(command node -v)"
  ver="${ver#v}"
  printf '%s\n' "${ver%%.*}"
}

preflight_node() {
  require_cmd node
  require_cmd npm
  local major
  major="$(node_major)"
  case "$major" in
    '' | *[!0-9]*) die "could not parse Node major version (found $(command node -v))" ;;
  esac
  ((major >= 24)) || die "Node >= 24 required (found $(command node -v))"
  if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
    local arch
    arch="$(command node -p 'process.arch')"
    [[ "$arch" == "arm64" ]] || die "Apple Silicon needs native arm64 Node (process.arch=${arch}). See CONTRIBUTING.md"
  fi
}

ensure_npm_ci() {
  local dir="$1"
  local lock="$dir/package-lock.json"
  local stamp="$dir/node_modules/.package-lock.json"
  [[ -f "$lock" ]] || die "missing package-lock.json in $dir"
  if [[ ! -d "$dir/node_modules" || ! -f "$stamp" || "$lock" -nt "$stamp" ]]; then
    printf 'dev-local: npm ci in %s\n' "$dir" >&2
    (cd "$dir" && npm ci)
  fi
}

ensure_wasm() {
  local pkg="crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js"
  if [[ ! -f "$pkg" ]]; then
    printf 'dev-local: WASM pkg missing; running npm run wasm:build\n' >&2
    npm run wasm:build || die "wasm:build failed (need rustup + wasm-pack). See CONTRIBUTING.md"
  fi
}

# firebase --project demo-jetlag reads functions/.env.demo-jetlag for defineString.
# Committed SoT is functions/.env.jet-lag-map-companion (prod project id).
ensure_functions_demo_env() {
  local src="functions/.env.jet-lag-map-companion"
  local dest="functions/.env.demo-jetlag"
  [[ -f "$src" ]] || die "missing ${src} (Functions defineString params; see CONTRIBUTING.md)"
  if [[ -f "$dest" && ! "$src" -nt "$dest" ]]; then
    return 0
  fi
  cp "$src" "$dest"
  printf 'dev-local: copied %s -> %s for demo-jetlag emulator params\n' "$src" "$dest" >&2
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  # Fallback: bash /dev/tcp connect attempt (macOS/Linux with bash)
  (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
}

print_port_listeners() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR==1 || NR>1 {print}' | sed 's/^/    /' >&2
  else
    printf '    (lsof not available)\n' >&2
  fi
}

kill_port_listeners() {
  local port="$1"
  local pids
  if ! command -v lsof >/dev/null 2>&1; then
    die "cannot kill port ${port}: lsof not found"
  fi
  pids="$(lsof -t -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -n "$pids" ]] || return 0
  printf 'dev-local: sending TERM to listener(s) on %s: %s\n' "$port" "$(echo "$pids" | tr '\n' ' ')" >&2
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 0.3
  pids="$(lsof -t -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    printf 'dev-local: sending KILL to stubborn listener(s) on %s: %s\n' "$port" "$(echo "$pids" | tr '\n' ' ')" >&2
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 0.2
  fi
  port_in_use "$port" && die "port ${port} still in use after kill"
}

# Space-delimited reserved ports for this run (avoid bash 3.2 empty-array + set -u).
ALLOCATED_PORTS=" "
# defaults = firebase.json / Vite 5173. new = next free per service.
PORT_MODE=defaults

port_reserved() {
  [[ "$ALLOCATED_PORTS" == *" $1 "* ]]
}

take_preferred_port() {
  local preferred="$1"
  ALLOCATED_PORTS+="${preferred} "
  FREE_PORT="$preferred"
}

# Sets FREE_PORT. Must not run under $() or ALLOCATED_PORTS is lost (subshell).
free_port_from() {
  local start="$1"
  local span="${2:-40}"
  local p end
  end=$((start + span))
  for ((p = start; p <= end; p++)); do
    if port_in_use "$p" || port_reserved "$p"; then
      continue
    fi
    ALLOCATED_PORTS+="${p} "
    FREE_PORT="$p"
    return 0
  done
  die "no free port in ${start}-${end}"
}

assign_service_port() {
  local preferred="$1"
  local span="${2:-40}"
  if [[ "$PORT_MODE" == defaults ]]; then
    take_preferred_port "$preferred"
  else
    free_port_from "$preferred" "$span"
  fi
}

# Args: "label:port" pairs. Sets PORT_MODE. TTY asks kill vs new ports; non-TTY uses new.
resolve_port_mode() {
  local busy=""
  local pair label port reply tty=""

  for pair in "$@"; do
    label="${pair%%:*}"
    port="${pair#*:}"
    if port_in_use "$port"; then
      busy+="${label}:${port} "
    fi
  done

  if [[ -z "$busy" ]]; then
    PORT_MODE=defaults
    return 0
  fi

  printf 'dev-local: default ports in use:\n' >&2
  for pair in $busy; do
    label="${pair%%:*}"
    port="${pair#*:}"
    printf '  %s :%s\n' "$label" "$port" >&2
    print_port_listeners "$port"
  done

  if [[ -e /dev/tty ]]; then
    tty=/dev/tty
  fi
  if [[ -n "$tty" ]]; then
    printf 'dev-local: [k]ill those listeners and use default ports, or [n]ew ports? [n] ' >&2
    read -r reply <"$tty" || reply=n
  else
    printf 'dev-local: no TTY; using new ports\n' >&2
    reply=n
  fi

  case "$reply" in
    k | K | kill | Kill)
      PORT_MODE=defaults
      for pair in $busy; do
        port="${pair#*:}"
        kill_port_listeners "$port"
      done
      printf 'dev-local: using default ports\n' >&2
      ;;
    *)
      PORT_MODE=new
      printf 'dev-local: using next free ports\n' >&2
      ;;
  esac
}

firebase_json_port() {
  local key="$1"
  local fallback="$2"
  KEY="$key" FALLBACK="$fallback" node -e '
    const j = require("./firebase.json");
    const p = j.emulators?.[process.env.KEY]?.port;
    process.stdout.write(String(p ?? process.env.FALLBACK));
  '
}

write_dev_local_firebase_json() {
  # Root-level config so firestore.rules / functions stay in-project (firebase
  # rejects ../ when --config lives under .firebase/).
  AUTH_PORT="$1" FIRESTORE_PORT="$2" STORAGE_PORT="$3" FUNCTIONS_PORT="$4" UI_PORT="$5" HUB_PORT="$6" LOGGING_PORT="$7" \
    EVENTARC_PORT="$8" TASKS_PORT="$9" \
    node -e '
      const fs = require("fs");
      const j = require("./firebase.json");
      const emu = j.emulators;
      const host = "127.0.0.1";
      emu.auth = { host, port: Number(process.env.AUTH_PORT) };
      emu.firestore = { host, port: Number(process.env.FIRESTORE_PORT) };
      emu.storage = { host, port: Number(process.env.STORAGE_PORT) };
      emu.functions = { host, port: Number(process.env.FUNCTIONS_PORT) };
      emu.ui = { enabled: true, host, port: Number(process.env.UI_PORT) };
      emu.hub = { host, port: Number(process.env.HUB_PORT) };
      emu.logging = { host, port: Number(process.env.LOGGING_PORT) };
      emu.eventarc = { host, port: Number(process.env.EVENTARC_PORT) };
      emu.tasks = { host, port: Number(process.env.TASKS_PORT) };
      fs.writeFileSync("firebase.dev-local.json", JSON.stringify(j, null, 2) + "\n");
    '
}

main() {
  local slug="${1:-}"
  local root vite_port auth_port firestore_port storage_port functions_port ui_port hub_port logging_port
  local eventarc_port tasks_port
  local auth_base firestore_base storage_base functions_base ui_base
  local FREE_PORT=""
  root="$(resolve_root "$slug")"
  cd "$root"
  printf 'dev-local: root=%s\n' "$root" >&2

  preflight_node
  require_cmd doppler

  ensure_npm_ci "$root"
  ensure_npm_ci "$root/functions"
  ensure_wasm
  ensure_functions_demo_env

  auth_base="$(firebase_json_port auth 9199)"
  firestore_base="$(firebase_json_port firestore 8180)"
  storage_base="$(firebase_json_port storage 9198)"
  functions_base="$(firebase_json_port functions 5001)"
  ui_base="$(firebase_json_port ui 4000)"

  resolve_port_mode \
    "vite:5173" \
    "auth:${auth_base}" \
    "firestore:${firestore_base}" \
    "storage:${storage_base}" \
    "functions:${functions_base}" \
    "ui:${ui_base}" \
    "hub:4400" \
    "logging:4500" \
    "eventarc:9299" \
    "tasks:9499"

  # CORS in functions/lib/cors.mjs allows Vite 5173-5200 only.
  assign_service_port 5173 27
  vite_port="$FREE_PORT"
  assign_service_port "$auth_base"
  auth_port="$FREE_PORT"
  assign_service_port "$firestore_base"
  firestore_port="$FREE_PORT"
  assign_service_port "$storage_base"
  storage_port="$FREE_PORT"
  assign_service_port "$functions_base"
  functions_port="$FREE_PORT"
  assign_service_port "$ui_base"
  ui_port="$FREE_PORT"
  assign_service_port 4400
  hub_port="$FREE_PORT"
  assign_service_port 4500
  logging_port="$FREE_PORT"
  assign_service_port 9299
  eventarc_port="$FREE_PORT"
  assign_service_port 9499
  tasks_port="$FREE_PORT"

  write_dev_local_firebase_json \
    "$auth_port" "$firestore_port" "$storage_port" "$functions_port" \
    "$ui_port" "$hub_port" "$logging_port" \
    "$eventarc_port" "$tasks_port"

  if [[ "$PORT_MODE" == new ]]; then
    printf 'dev-local: second emulator suite is expected on new ports; prefer kill for a quiet single stack\n' >&2
  fi

  printf 'dev-local: Vite http://127.0.0.1:%s/\n' "$vite_port" >&2
  printf 'dev-local: Emulator UI http://127.0.0.1:%s/\n' "$ui_port" >&2
  printf 'dev-local: emulators auth=%s firestore=%s storage=%s functions=%s\n' \
    "$auth_port" "$firestore_port" "$storage_port" "$functions_port" >&2
  printf 'dev-local: starting emulators + vite (Ctrl+C stops both)\n' >&2

  # Export only remap vars for run-dev-emulator.sh (captured before doppler; no --preserve-env).
  export VITE_DEV_PORT="$vite_port"
  export VITE_FIREBASE_AUTH_EMULATOR_PORT="$auth_port"
  export VITE_FIRESTORE_EMULATOR_PORT="$firestore_port"
  export VITE_FIREBASE_STORAGE_EMULATOR_PORT="$storage_port"
  export VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT="$functions_port"

  exec npm exec -- concurrently \
    --kill-others \
    --names emulators,vite \
    -c blue,green \
    "npm run emulators:local" \
    "npm run dev:emulator"
}

main "$@"
