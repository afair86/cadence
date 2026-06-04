import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import { app } from '../apps/api/src/app.js';

const handler = serverless(app);

export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
