import { Router } from 'express';
import {
  getTeamByCaptureToken,
  parseEmailWebhook,
  processCapturePayload,
  processSmsWebhook,
} from '../../services/capture.service.js';
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

/** Generic auto-capture — iPhone Shortcuts, Zapier, Android automations */
router.post('/:token', async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;

  try {
    const row = await processCapturePayload(team.id, req.body);
    res.status(201).json({ ok: true, matched: Boolean(row.contactId), message: toInboundDto(row) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** Email auto-capture — Mailgun, SendGrid, or JSON { from, body, subject } */
router.post('/:token/email', async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;

  try {
    const payload = parseEmailWebhook(req.body as Record<string, unknown>);
    const row = await processCapturePayload(team.id, payload);
    res.status(201).json({ ok: true, matched: Boolean(row.contactId), message: toInboundDto(row) });
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

export default router;
