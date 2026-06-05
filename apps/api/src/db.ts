import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    ''
  );
}

const databaseUrl = resolveDatabaseUrl();
if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

const globalForPrisma = globalThis as PrismaGlobal;

function createPrismaClient(): PrismaClient {
  if (!databaseUrl) {
    return new PrismaClient();
  }

  const pool = globalForPrisma.pgPool ?? new pg.Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pgPool = pool;
  }

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
