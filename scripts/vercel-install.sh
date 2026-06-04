#!/usr/bin/env bash
set -euo pipefail
corepack enable
# Support Vercel root directory = repo root or apps/web
if [ -f ../../pnpm-workspace.yaml ]; then
  cd ../..
fi
pnpm install --filter @cadence/web --filter @cadence/api --filter @cadence/shared
