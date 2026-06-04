#!/usr/bin/env bash
set -euo pipefail

# Neon on Vercel often sets POSTGRES_PRISMA_URL instead of DATABASE_URL
if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_PRISMA_URL:-}" ]; then
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
fi

pnpm --filter @cadence/shared build
pnpm --filter @cadence/api exec prisma generate
pnpm --filter @cadence/api build

if [ -n "${DATABASE_URL:-}" ]; then
  pnpm --filter @cadence/api exec prisma db push
  pnpm --filter @cadence/api db:seed
fi

pnpm --filter @cadence/web build
