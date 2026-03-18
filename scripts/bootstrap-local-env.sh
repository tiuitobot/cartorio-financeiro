#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV="$ROOT_DIR/backend/.env"
FRONTEND_ENV="$ROOT_DIR/frontend/.env.local"
FORCE="${1:-}"

if [ -n "$FORCE" ] && [ "$FORCE" != "--force" ]; then
  echo "Uso: ./scripts/bootstrap-local-env.sh [--force]"
  exit 1
fi

backup_if_needed() {
  local target="$1"
  if [ -f "$target" ]; then
    local backup="${target}.bak.$(date +%Y%m%d%H%M%S)"
    cp "$target" "$backup"
    echo "Backup criado: $backup"
  fi
}

write_backend_env() {
  cat > "$BACKEND_ENV" <<'EOF'
NODE_ENV=development
HOST=0.0.0.0
PORT=3001
APP_BASE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:4173,http://127.0.0.1:4173

DATABASE_URL=postgres://cartorio_user:cartorio_dev@localhost:5432/cartorio
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cartorio
DB_USER=cartorio_user
DB_PASSWORD=cartorio_dev
DB_SSL=false
DB_POOL_MAX=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000

JWT_SECRET=troque-esta-chave-local-antes-de-expor
JWT_EXPIRES_IN=8h
EOF
}

write_frontend_env() {
  cat > "$FRONTEND_ENV" <<'EOF'
VITE_PROXY_TARGET=http://localhost:3001
VITE_API_BASE_URL=/api
VITE_USE_MOCK=false
EOF
}

write_or_preserve() {
  local target="$1"
  local writer="$2"

  if [ -f "$target" ] && [ "$FORCE" != "--force" ]; then
    echo "Preservado: $target"
    echo "  Use --force para substituir pelo preset local padrao."
    return
  fi

  if [ -f "$target" ] && [ "$FORCE" = "--force" ]; then
    backup_if_needed "$target"
  fi

  "$writer"
  echo "Gerado: $target"
}

write_or_preserve "$BACKEND_ENV" write_backend_env
write_or_preserve "$FRONTEND_ENV" write_frontend_env

echo
echo "Proximos passos:"
echo "  1. ./scripts/check-local-prereqs.sh"
echo "  2. ./scripts/bootstrap-local-db.sh"
echo "  3. cd backend && npm run migrate"
echo "  4. cd backend && ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create"
