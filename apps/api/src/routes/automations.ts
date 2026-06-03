import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import { formatScheduled } from '../lib/helpers.js';
import { generateMessage } from '../services/ai.service.js';
import { daysSince } from '../lib/helpers.js';

const router = Router();
router.use(authMiddleware);

router.get('/upcoming', async (req, res) => {
  const { teamId } = getAuth(req);
  const rows = await prisma.automation.findMany({
    where: { status: { in: ['pending', 'scheduled'] }, contact: { teamId } },
    include: { contact: true },
    orderBy: { scheduledAt: 'asc' },
    take: 20,
  });

  res.json(
    rows.map((a) => ({
      id: a.id,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      scheduledFor: formatScheduled(a.scheduledAt),
      message: a.message,
      status: a.status,
      channel: a.channel,
    })),
  );
});

router.post('/:id/approve', async (req, res) => {
  const { teamId } = getAuth(req);
  const auto = await prisma.automation.findFirst({
    where: { id: req.params.id, contact: { teamId } },
  });
  if (!auto) {
    res.status(404).json({ error: 'Automation not found' });
    return;
  }

  const updated = await prisma.automation.update({
    where: { id: auto.id },
    data: { status: 'scheduled' },
  });
  res.json({ ok: true, id: updated.id, status: updated.status });
});

router.post('/generate', async (req, res) => {
  const { teamId } = getAuth(req);
  const { contactId, channel } = req.body as { contactId?: string; channel?: string };

  if (!contactId) {
    res.status(400).json({ error: 'contactId required' });
    return;
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, teamId },
  });
  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  const ch = (channel ?? contact.preferredMethod) as 'call' | 'sms' | 'email' | 'meeting';
  const draft = await generateMessage(
    {
      id: contact.id,
      name: contact.name,
      company: contact.company,
      preferredMethod: contact.preferredMethod,
      preferredTimes: contact.preferredTimes,
      healthStatus: contact.healthStatus,
      lastContactDaysAgo: daysSince(contact.lastContactAt),
      tags: contact.tags,
    },
    ch,
  );

  const scheduledAt = new Date();
  scheduledAt.setMinutes(scheduledAt.getMinutes() + 30);

  const automation = await prisma.automation.create({
    data: {
      contactId: contact.id,
      channel: ch,
      message: draft.message,
      insight: draft.insight,
      scheduledAt,
      status: 'pending',
    },
    include: { contact: true },
  });

  res.status(201).json({
    id: automation.id,
    contactName: automation.contact.name,
    company: automation.contact.company,
    message: automation.message,
    insight: automation.insight,
    scheduledFor: formatScheduled(automation.scheduledAt),
    channel: automation.channel,
  });
});

export default router;
