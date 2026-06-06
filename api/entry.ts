if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    '';
}

import serverless from 'serverless-http';
import { createApp } from '../apps/api/src/app.js';

export default serverless(createApp());
