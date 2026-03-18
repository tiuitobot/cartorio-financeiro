#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  echo "backend/.env ausente. Execute antes: ./scripts/bootstrap-local-env.sh"
  exit 1
fi

cd "$ROOT_DIR/backend"
exec npm run dev
