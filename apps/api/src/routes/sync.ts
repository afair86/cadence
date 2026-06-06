import { Router } from 'express';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import { buildCaptureSetup, publicApiBase } from '../services/capture.service.js';
import { recordInboundMessage } from '../services/inbound-message.service.js';
import { toInboundDto } from '../services/inbound-message.service.js';
import { prisma } from '../db.js';
import { pointsForActivity, refreshContactHealth } from '../services/points.service.js';
import type { ActivityType, CreateActivityInput } from '@cadence/shared';

const router = Router();
router.use(authMiddleware);

router.get('/setup', async (req, res) => {
  const { teamId } = getAuth(req);
  const capture = await buildCaptureSetup(teamId, publicApiBase(req));
  res.json(capture);
});

router.post('/test/:channel', async (req, res) => {
  const { teamId, userId } = getAuth(req);
  const channel = req.params.channel;

  if (channel === 'message') {
    const row = await recordInboundMessage({
      teamId,
      platform: 'sms',
      body: 'Test sync — text message captured successfully. You can ignore this.',
      fromLabel: 'Cadence test',
      externalId: `sync-test-msg-${Date.now()}`,
    });
    res.status(201).json({ ok: true, channel, message: toInboundDto(row) });
    return;
  }

  if (channel === 'email') {
    const row = await recordInboundMessage({
      teamId,
      platform: 'email',
      body: 'Test sync — email captured successfully. You can ignore this.',
      fromLabel: 'test@cadence.app',
      externalId: `sync-test-email-${Date.now()}`,
    });
    res.status(201).json({ ok: true, channel, message: toInboundDto(row) });
    return;
  }

  if (channel === 'call') {
    const contact = await prisma.contact.findFirst({ where: { teamId }, orderBy: { name: 'asc' } });
    if (!contact) {
      res.status(400).json({ error: 'Add at least one contact with a phone number to test call sync.' });
      return;
    }

    const points = await pointsForActivity(teamId, 'call');
    const activity = await prisma.activity.create({
      data: {
        userId,
        contactId: contact.id,
        type: 'call',
        notes: 'Test sync — phone call logged successfully.',
        points,
        durationMin: 2,
      },
      include: { contact: true },
    });
    await refreshContactHealth(contact.id);

    res.status(201).json({
      ok: true,
      channel,
      activity: {
        id: activity.id,
        contactName: activity.contact.name,
        type: activity.type,
      },
    });
    return;
  }

  res.status(400).json({ error: 'Unknown channel — use message, email, or call' });
});

router.post('/log', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body as CreateActivityInput;

  if (!body.contactId || !body.type) {
    res.status(400).json({ error: 'contactId and type required' });
    return;
  }

  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, teamId },
  });
  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  const points = await pointsForActivity(teamId, body.type as ActivityType);
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();

  const activity = await prisma.activity.create({
    data: {
      userId,
      contactId: body.contactId,
      type: body.type,
      durationMin: body.durationMin,
      outcome: body.outcome,
      notes: body.notes,
      points,
      occurredAt,
    },
    include: { contact: true },
  });

  await prisma.contact.update({
    where: { id: body.contactId },
    data: { lastContactAt: occurredAt },
  });
  await refreshContactHealth(body.contactId);

  res.status(201).json({
    id: activity.id,
    contactId: activity.contactId,
    contactName: activity.contact.name,
    type: activity.type,
    points: activity.points,
    occurredAt: activity.occurredAt.toISOString(),
  });
});

export default router;
