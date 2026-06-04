#!/usr/bin/env bash
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_PRISMA_URL:-}" ]; then
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
fi
if [ -n "${DATABASE_URL:-}" ]; then
  pnpm --filter @cadence/api exec prisma db push
  pnpm --filter @cadence/api db:seed
fi
