import { Router } from 'express';
import { prisma } from '../../db.js';
import { processSmsWebhook } from '../../services/capture.service.js';

const router = Router();

/** Legacy Twilio SMS webhook — prefer /api/webhooks/capture/:token/sms */
router.post('/sms', async (req, res) => {
  const teamId = process.env.TWILIO_DEFAULT_TEAM_ID;
  if (!teamId) {
    res.status(503).type('text/xml').send('<Response></Response>');
    return;
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    res.status(503).type('text/xml').send('<Response></Response>');
    return;
  }

  const from = String(req.body.From ?? '');
  const body = String(req.body.Body ?? '').trim();
  const messageSid = req.body.MessageSid ? String(req.body.MessageSid) : undefined;

  if (!body) {
    res.type('text/xml').send('<Response></Response>');
    return;
  }

  try {
    await processSmsWebhook(team.id, from, body, messageSid);
  } catch (err) {
    console.warn('Twilio SMS capture failed:', (err as Error).message);
  }

  res.type('text/xml').send('<Response></Response>');
});

export default router;
