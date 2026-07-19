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

echo "==> Starting API server (migrations run after listen)..."
exec node dist/index.js
