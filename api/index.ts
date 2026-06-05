import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;
let handler: Handler | undefined;

export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!handler) {
      const mod = await import('./handler.mjs');
      handler = mod.default as Handler;
    }
    return handler(req, res);
  } catch (error) {
    console.error('Cadence API bootstrap failed:', error);
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
