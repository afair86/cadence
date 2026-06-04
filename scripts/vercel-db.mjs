import { execSync } from 'node:child_process';

if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

if (!process.env.DATABASE_URL) {
  console.log('Skipping database setup: DATABASE_URL not set');
  process.exit(0);
}

execSync('pnpm --filter @cadence/api exec prisma db push', {
  stdio: 'inherit',
  env: process.env,
});
execSync('pnpm --filter @cadence/api db:seed', {
  stdio: 'inherit',
  env: process.env,
});
