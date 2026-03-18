#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MISSING=0

check_cmd() {
  local name="$1"
  local version_flag="${2:---version}"

  if command -v "$name" >/dev/null 2>&1; then
    local version
    version="$("$name" "$version_flag" 2>/dev/null | head -n 1 || true)"
    echo "OK   comando: $name ${version:+($version)}"
  else
    echo "MISS comando: $name"
    MISSING=1
  fi
}

check_file() {
  local path="$1"
  if [ -f "$path" ]; then
    echo "OK   arquivo: $path"
  else
    echo "WARN arquivo: $path ausente"
  fi
}

check_cmd node
check_cmd npm
check_cmd psql
check_cmd createdb
check_cmd createuser
check_cmd curl

check_file "$ROOT_DIR/backend/.env"
check_file "$ROOT_DIR/frontend/.env.local"

if [ -f "$ROOT_DIR/frontend/.env.local" ] && grep -q '^VITE_USE_MOCK=true$' "$ROOT_DIR/frontend/.env.local"; then
  echo "WARN frontend/.env.local esta configurado para mock. Use ./scripts/bootstrap-local-env.sh --force para apontar ao backend local."
fi

if [ "$MISSING" -ne 0 ]; then
  echo
  echo "Dependencias ausentes para o fluxo local nativo."
  echo "Ubuntu/WSL:"
  echo "  sudo apt-get update"
  echo "  sudo apt-get install -y postgresql postgresql-client"
  exit 1
fi

echo
echo "Prerequisitos minimos OK."
