#!/bin/sh
set -eu

cd /app/backend

should_run_migrations="${RUN_MIGRATIONS_ON_BOOT:-1}"

case "$should_run_migrations" in
  1|true|TRUE|yes|YES|on|ON)
    echo "==> Applying database migrations"
    npm run migrate
    ;;
  *)
    echo "==> Skipping database migrations"
    ;;
esac

echo "==> Starting API"
exec node server.js
