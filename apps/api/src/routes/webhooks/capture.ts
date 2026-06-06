import { Router } from 'express';
import {
  getTeamByCaptureToken,
  parseEmailWebhook,
  processCapturePayload,
  processSmsWebhook,
} from '../../services/capture.service.js';
import { processCallCapture } from '../../services/sync.service.js';
import { toInboundDto } from '../../services/inbound-message.service.js';

const router = Router();

async function teamOr404(token: string, res: import('express').Response) {
  const team = await getTeamByCaptureToken(token);
  if (!team) {
    res.status(404).json({ error: 'Unknown capture link' });
    return null;
  }
  return team;
}

function captureResponse(res: import('express').Response, result: unknown) {
  if (result && typeof result === 'object' && 'matched' in result) {
    const r = result as { matched: boolean; activity?: { id: string } | null };
    res.status(r.matched ? 201 : 202).json({
      ok: true,
      matched: r.matched,
      activityId: r.activity?.id,
      hint: r.matched ? undefined : 'Add this person to Contacts with their phone or email.',
    });
    return;
  }

  const row = result as { contactId?: string | null; id: string };
  res.status(201).json({
    ok: true,
    matched: Boolean(row.contactId),
    message: toInboundDto(row as Parameters<typeof toInboundDto>[0]),
  });
}

/** Generic auto-capture — iPhone Shortcuts, Zapier, Android automations */
router.post('/:token', async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;

  try {
    const result = await processCapturePayload(team.id, req.body);
    captureResponse(res, result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** Email auto-capture — Mailgun, SendGrid, Zapier, or JSON { from, body, subject } */
router.post('/:token/email', async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;

  try {
    const payload = parseEmailWebhook(req.body as Record<string, unknown>);
    const result = await processCapturePayload(team.id, payload);
    captureResponse(res, result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** SMS auto-capture — Twilio and compatible providers */
router.post('/:token/sms', async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;

  const from = String(req.body.From ?? req.body.from ?? '');
  const body = String(req.body.Body ?? req.body.body ?? '').trim();
  const messageSid = req.body.MessageSid ? String(req.body.MessageSid) : undefined;

  if (!body) {
    res.type('text/xml').send('<Response></Response>');
    return;
  }

  try {
    await processSmsWebhook(team.id, from, body, messageSid);
  } catch (err) {
    console.warn('SMS capture failed:', (err as Error).message);
  }

  res.type('text/xml').send('<Response></Response>');
});

/** Phone call auto-capture — iPhone Shortcuts after a call ends */
router.post('/:token/call', async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;

  try {
    const result = await processCallCapture(team.id, req.body);
    captureResponse(res, result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
