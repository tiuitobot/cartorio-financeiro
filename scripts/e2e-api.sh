#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED_PASSWORD="${SEED_DEV_PASSWORD:-CartorioDev123}"

if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  echo "backend/.env ausente. Execute antes: ./scripts/bootstrap-local-env.sh --force"
  exit 1
fi

cd "$ROOT_DIR/backend"
npm run migrate
SEED_DEV_PASSWORD="$SEED_PASSWORD" npm run seed:dev
exec npm start
