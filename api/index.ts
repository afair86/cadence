import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';

type ServerlessHandler = ReturnType<typeof serverless>;
let cached: ServerlessHandler | undefined;

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      process.env.POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_URL ??
      process.env.POSTGRES_URL_NON_POOLING ??
      '';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    ensureDatabaseUrl();
    if (!cached) {
      const { createApp } = await import('../apps/api/dist/app.js');
      cached = serverless(createApp());
    }
    return cached(req, res);
  } catch (error) {
    console.error('Cadence API failed to start:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Serverless function failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
