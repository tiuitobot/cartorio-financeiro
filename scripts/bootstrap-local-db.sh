#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV="$ROOT_DIR/backend/.env"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql nao encontrado. Instale PostgreSQL antes de executar este bootstrap."
  exit 1
fi

if [ ! -f "$BACKEND_ENV" ]; then
  echo "Arquivo $BACKEND_ENV ausente."
  echo "Execute antes: ./scripts/bootstrap-local-env.sh"
  exit 1
fi

set -a
. "$BACKEND_ENV"
set +a

require_env() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    echo "$name e obrigatorio em backend/.env para bootstrap do banco."
    exit 1
  fi
}

sql_escape_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

sql_escape_ident() {
  printf "%s" "$1" | sed 's/"/""/g'
}

require_env DB_NAME
require_env DB_USER
require_env DB_PASSWORD

PGHOST="${PGHOST:-${DB_HOST:-localhost}}"
PGPORT="${PGPORT:-${DB_PORT:-5432}}"
SUPERUSER="${LOCAL_PG_SUPERUSER:-postgres}"
SUPERDB="${LOCAL_PG_SUPERDATABASE:-postgres}"
USE_SUDO="${LOCAL_PG_USE_SUDO:-0}"
SYSTEM_USER="${LOCAL_PG_SYSTEM_USER:-postgres}"

DB_USER_LIT="$(sql_escape_literal "$DB_USER")"
DB_PASSWORD_LIT="$(sql_escape_literal "$DB_PASSWORD")"
DB_NAME_LIT="$(sql_escape_literal "$DB_NAME")"
DB_USER_IDENT="$(sql_escape_ident "$DB_USER")"
DB_NAME_IDENT="$(sql_escape_ident "$DB_NAME")"

run_super_psql() {
  if [ "$USE_SUDO" = "1" ]; then
    sudo -u "$SYSTEM_USER" psql -v ON_ERROR_STOP=1 -d "$SUPERDB" "$@"
    return
  fi

  psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$SUPERUSER" -d "$SUPERDB" "$@"
}

run_app_psql() {
  if [ "$USE_SUDO" = "1" ]; then
    sudo -u "$SYSTEM_USER" psql -v ON_ERROR_STOP=1 -d "$DB_NAME" "$@"
    return
  fi

  psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$SUPERUSER" -d "$DB_NAME" "$@"
}

if [ "$USE_SUDO" = "1" ]; then
  echo "Conectando via sudo -u $SYSTEM_USER para preparar $DB_NAME..."
else
  echo "Conectando em $PGHOST:$PGPORT como $SUPERUSER para preparar $DB_NAME..."
fi

if ! run_super_psql -c "SELECT 1;" >/dev/null 2>&1; then
  echo "Falha ao conectar como usuario administrativo."
  echo
  echo "Tente um destes caminhos:"
  echo "  1. informar senha do superusuario:"
  echo "     PGPASSWORD='sua-senha' ./scripts/bootstrap-local-db.sh"
  echo "  2. usar sudo no usuario postgres:"
  echo "     LOCAL_PG_USE_SUDO=1 ./scripts/bootstrap-local-db.sh"
  echo "  3. apontar para outro superusuario:"
  echo "     LOCAL_PG_SUPERUSER=seu_usuario ./scripts/bootstrap-local-db.sh"
  exit 1
fi

run_super_psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER_LIT') THEN CREATE ROLE \"$DB_USER_IDENT\" LOGIN PASSWORD '$DB_PASSWORD_LIT'; ELSE ALTER ROLE \"$DB_USER_IDENT\" WITH LOGIN PASSWORD '$DB_PASSWORD_LIT'; END IF; END \$\$;"

DB_EXISTS="$(run_super_psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME_LIT'")"
if [ "$DB_EXISTS" != "1" ]; then
  run_super_psql -c "CREATE DATABASE \"$DB_NAME_IDENT\" OWNER \"$DB_USER_IDENT\";"
  echo "Banco criado: $DB_NAME"
else
  run_super_psql -c "ALTER DATABASE \"$DB_NAME_IDENT\" OWNER TO \"$DB_USER_IDENT\";"
  echo "Banco ja existente: $DB_NAME"
fi

run_app_psql \
  -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME_IDENT\" TO \"$DB_USER_IDENT\";" \
  -c "ALTER SCHEMA public OWNER TO \"$DB_USER_IDENT\";" \
  -c "GRANT ALL ON SCHEMA public TO \"$DB_USER_IDENT\";" >/dev/null

echo
echo "Bootstrap do banco concluido."
echo "Proximos passos:"
echo "  cd backend && npm run migrate"
echo "  cd backend && ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create"
