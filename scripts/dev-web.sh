#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT_DIR/frontend/.env.local" ]; then
  echo "frontend/.env.local ausente. Execute antes: ./scripts/bootstrap-local-env.sh"
  exit 1
fi

cd "$ROOT_DIR/frontend"

if [ "$#" -gt 0 ]; then
  exec npm run dev -- "$@"
fi

exec npm run dev -- --host 0.0.0.0
