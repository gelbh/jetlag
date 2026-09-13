#!/usr/bin/env bash
# Lint a PR title with commitlint (Conventional Commits).
# Usage:
#   npm run lint:pr-title -- "feat(ui): add dark mode"
#   gh pr view --json title -q .title | npm run lint:pr-title
#   npm run lint:pr-title   # uses open PR for current branch via gh
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

title="${*:-}"
if [ -z "$title" ] && [ ! -t 0 ]; then
  title="$(cat)"
fi
if [ -z "$title" ] && command -v gh >/dev/null 2>&1; then
  title="$(gh pr view --json title --jq .title 2>/dev/null || true)"
fi
if [ -z "${title:-}" ]; then
  echo "lint:pr-title: no title (pass an arg, pipe stdin, or open a PR for this branch)" >&2
  exit 1
fi

printf '%s\n' "$title" | npx --no -- commitlint --config commitlint.pr-title.config.mjs
