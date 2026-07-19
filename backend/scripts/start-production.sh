#!/usr/bin/env bash
set -euo pipefail

echo "==> CMS backend production startup"

if [[ "${DB_CLIENT:-}" == "pg" || "${DB_CLIENT:-}" == "postgresql" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL is required when DB_CLIENT=pg"
    exit 1
  fi
  echo "==> Database: PostgreSQL (remote)"
else
  echo "==> Database: SQLite (local)"
fi

if [[ -z "${SECRET_KEY:-}" ]]; then
  echo "ERROR: SECRET_KEY is required"
  exit 1
fi

export NODE_OPTIONS="--import tsx"

echo "==> Running migrations..."
npx knex migrate:latest --knexfile knexfile.ts

echo "==> Running seeds..."
npx knex seed:run --knexfile knexfile.ts

echo "==> Starting API server..."
exec node dist/index.js
