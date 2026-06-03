import { Router } from 'express';
import type { ContactMethod, LogInboundInput, MessagePlatform, MessagesData, Sphere } from '@cadence/shared';
import { prisma } from '../db.js';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import { formatScheduled, daysSince } from '../lib/helpers.js';
import { generateMessage } from '../services/ai.service.js';
import { parseSectionQuery } from '../lib/sections.js';
import { contactIdsForSection } from '../lib/sectionFilter.js';
import { recordInboundMessage, toInboundDto } from '../services/inbound-message.service.js';
import { scanAndSaveCommitments } from '../services/commitment.service.js';
import { buildCaptureSetup, publicApiBase } from '../services/capture.service.js';

const router = Router();
router.use(authMiddleware);

function contactFilter(teamId: string, contactIds: string[] | null) {
  return contactIds ? { teamId, id: { in: contactIds } } : { teamId };
}

router.get('/', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section as string | undefined);
  const contactIds = await contactIdsForSection(teamId, section);
  const filter = contactFilter(teamId, contactIds);

  const inboundWhere = contactIds
    ? { teamId, contactId: { in: contactIds } }
    : { teamId };

  const [inboundRows, upcomingRows, sentRows] = await Promise.all([
    prisma.inboxMessage.findMany({
      where: inboundWhere,
      include: { contact: true },
      orderBy: { receivedAt: 'desc' },
      take: 50,
    }),
    prisma.automation.findMany({
      where: {
        status: { in: ['pending', 'scheduled'] },
        contact: filter,
      },
      include: { contact: true },
      orderBy: { scheduledAt: 'asc' },
      take: 30,
    }),
    prisma.activity.findMany({
      where: {
        userId,
        type: { in: ['sms', 'email', 'note'] },
        contact: filter,
      },
      include: { contact: true },
      orderBy: { occurredAt: 'desc' },
      take: 30,
    }),
  ]);

  const inbound = inboundRows.map(toInboundDto);

  const unreadCount = inbound.filter((m) => m.status === 'unread').length;
  let capture = { webhookUrl: '', emailWebhookUrl: '', smsWebhookUrl: '' };
  try {
    capture = await buildCaptureSetup(teamId, publicApiBase(req));
  } catch {
    // Team missing or DB issue — still return messages without crashing
  }

  const data: MessagesData = {
    inbound,
    unreadCount,
    upcoming: upcomingRows.map((a) => ({
      id: a.id,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      sphere: a.contact.sphere as Sphere,
      scheduledFor: formatScheduled(a.scheduledAt),
      message: a.message,
      status: a.status as 'pending' | 'scheduled',
      channel: a.channel as ContactMethod,
      insight: a.insight ?? undefined,
    })),
    sent: sentRows.map((a) => ({
      id: a.id,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      sphere: a.contact.sphere as Sphere,
      channel: (a.type === 'email' ? 'email' : a.type === 'sms' ? 'sms' : 'sms') as ContactMethod,
      message:
        a.notes?.trim() ||
        `${a.type === 'sms' ? 'Text' : a.type === 'email' ? 'Email' : 'Message'} with ${a.contact.name}`,
      sentAt: formatScheduled(a.occurredAt),
    })),
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
    captureEnabled: true,
    capture,
  };

  res.json(data);
});

router.post('/capture/test', async (req, res) => {
  const { teamId } = getAuth(req);

  const row = await recordInboundMessage({
    teamId,
    platform: 'sms',
    body: 'Test auto-capture — you can delete this after confirming it works.',
    fromLabel: 'Cadence test',
    externalId: `test-${Date.now()}`,
  });

  res.status(201).json(toInboundDto(row));
});

router.post('/inbound', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body as LogInboundInput;

  if (!body.contactId || !body.body?.trim() || !body.platform) {
    res.status(400).json({ error: 'contactId, platform, and body required' });
    return;
  }

  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, teamId },
  });
  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  const row = await recordInboundMessage({
    teamId,
    userId,
    contactId: contact.id,
    platform: body.platform,
    body: body.body.trim(),
    receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
  });

  const commitments = await scanAndSaveCommitments({
    teamId,
    userId,
    contactId: contact.id,
    text: body.body.trim(),
    direction: 'theirs',
    source: 'inbox',
    sourceId: row.id,
    messageDate: row.receivedAt,
  });

  res.status(201).json({ ...toInboundDto({ ...row, contact }), commitments });
});

router.patch('/inbox/:id/read', async (req, res) => {
  const { teamId } = getAuth(req);
  const row = await prisma.inboxMessage.findFirst({
    where: { id: req.params.id, teamId },
  });
  if (!row) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  const updated = await prisma.inboxMessage.update({
    where: { id: row.id },
    data: { status: 'read' },
    include: { contact: true },
  });

  res.json(toInboundDto(updated));
});

router.post('/generate', async (req, res) => {
  const { teamId } = getAuth(req);
  const { contactId, channel, replyTo } = req.body as {
    contactId?: string;
    channel?: string;
    replyTo?: string;
  };

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

  const ch = (channel ?? contact.preferredMethod) as ContactMethod;
  if (ch !== 'sms' && ch !== 'email') {
    res.status(400).json({ error: 'Messages support SMS or email only' });
    return;
  }

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
      sphere: contact.sphere as Sphere,
    },
    ch,
    typeof replyTo === 'string' ? replyTo : undefined,
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
    contactId: automation.contactId,
    contactName: automation.contact.name,
    company: automation.contact.company,
    sphere: automation.contact.sphere,
    scheduledFor: formatScheduled(automation.scheduledAt),
    message: automation.message,
    status: automation.status,
    channel: automation.channel,
    insight: automation.insight ?? undefined,
  });
});

router.post('/:id/approve', async (req, res) => {
  const { teamId } = getAuth(req);
  const auto = await prisma.automation.findFirst({
    where: { id: req.params.id, contact: { teamId } },
  });
  if (!auto) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  const updated = await prisma.automation.update({
    where: { id: auto.id },
    data: { status: 'scheduled' },
  });
  res.json({ ok: true, id: updated.id, status: updated.status });
});

router.patch('/:id', async (req, res) => {
  const { teamId } = getAuth(req);
  const { message } = req.body as { message?: string };
  if (!message?.trim()) {
    res.status(400).json({ error: 'Message text required' });
    return;
  }

  const auto = await prisma.automation.findFirst({
    where: {
      id: req.params.id,
      contact: { teamId },
      status: { in: ['pending', 'scheduled'] },
    },
  });
  if (!auto) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  const updated = await prisma.automation.update({
    where: { id: auto.id },
    data: { message: message.trim() },
  });

  res.json({
    id: updated.id,
    message: updated.message,
    status: updated.status,
  });
});

router.delete('/:id', async (req, res) => {
  const { teamId } = getAuth(req);
  const auto = await prisma.automation.findFirst({
    where: { id: req.params.id, contact: { teamId } },
  });
  if (!auto) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  await prisma.automation.update({
    where: { id: auto.id },
    data: { status: 'cancelled' },
  });
  res.json({ ok: true });
});

export default router;
