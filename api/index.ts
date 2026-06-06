import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';

let app: Express | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!app) {
      // Built during vercel:build — included via vercel.json includeFiles
      const mod = await import('./index.js');
      app = (mod.default ?? mod) as Express;
    }
    await new Promise<void>((resolve, reject) => {
      app!(req, res, (err: unknown) => (err ? reject(err) : resolve()));
    });
  } catch (error) {
    console.error('Cadence API error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Serverless function failed',
      });
    }
  }
}
