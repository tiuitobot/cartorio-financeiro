#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV="$ROOT_DIR/backend/.env"

if [ -f "$BACKEND_ENV" ]; then
  set -a
  . "$BACKEND_ENV"
  set +a
fi

API_BASE_URL="${API_BASE_URL:-${APP_BASE_URL:-http://localhost:3001}}"
LOGIN_EMAIL="${SMOKE_EMAIL:-${ADMIN_EMAIL:-}}"
LOGIN_PASSWORD="${SMOKE_PASSWORD:-${ADMIN_PASSWORD:-}}"

echo "Health check em $API_BASE_URL/api/health"
HEALTH_RESPONSE="$(curl -fsS "$API_BASE_URL/api/health")"
echo "$HEALTH_RESPONSE"

if [ -z "$LOGIN_EMAIL" ] || [ -z "$LOGIN_PASSWORD" ]; then
  echo
  echo "Smoke basico concluido."
  echo "Defina SMOKE_EMAIL e SMOKE_PASSWORD para validar login e /api/auth/me."
  exit 0
fi

LOGIN_RESPONSE="$(curl -fsS \
  -H 'Content-Type: application/json' \
  -X POST \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"senha\":\"$LOGIN_PASSWORD\"}" \
  "$API_BASE_URL/api/auth/login")"

TOKEN="$(printf '%s' "$LOGIN_RESPONSE" | node -e "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { const json = JSON.parse(data); if (!json.token) process.exit(1); process.stdout.write(json.token); });")"

echo
echo "Auth check em $API_BASE_URL/api/auth/me"
curl -fsS -H "Authorization: Bearer $TOKEN" "$API_BASE_URL/api/auth/me"
echo
echo
echo "Smoke completo concluido."
