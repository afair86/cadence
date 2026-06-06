import { execSync } from 'node:child_process';

// Schema push needs a direct Postgres URL (not the pooled Prisma URL).
function resolveDirectDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    ''
  );
}

const databaseUrl = resolveDirectDatabaseUrl();
if (!databaseUrl) {
  console.log('Skipping database setup: no Postgres URL in environment');
  process.exit(0);
}

const env = { ...process.env, DATABASE_URL: databaseUrl };

function run(label, command) {
  console.log(`\n==> ${label}`);
  execSync(command, { stdio: 'inherit', env, cwd: process.cwd() });
}

try {
  run('Push schema', 'pnpm --filter @cadence/api db:push');
  run('Seed demo data', 'pnpm --filter @cadence/api db:seed');
  console.log('\nDatabase setup complete.');
} catch (error) {
  console.warn('\nDatabase setup failed (deploy will continue):');
  console.warn(error instanceof Error ? error.message : String(error));
  console.warn('If login fails, check DATABASE_URL / Neon vars in Vercel settings.');
}
