import { Router } from 'express';
import type { ActivityType, CreateActivityInput } from '@cadence/shared';
import { prisma } from '../db.js';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import {
  pointsForActivity,
  refreshContactHealth,
} from '../services/points.service.js';
import { scanAndSaveCommitments } from '../services/commitment.service.js';
import { parseSectionQuery } from '../lib/sections.js';
import { activityFilter, contactIdsForSection } from '../lib/sectionFilter.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const limit = Number(req.query.limit) || 50;
  const section = parseSectionQuery(req.query.section as string | undefined);
  const contactIds = await contactIdsForSection(teamId, section);

  const rows = await prisma.activity.findMany({
    where: activityFilter(userId, teamId, contactIds),    include: { contact: true },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  });

  res.json(
    rows.map((a) => ({
      id: a.id,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      type: a.type as ActivityType,
      durationMin: a.durationMin ?? undefined,
      outcome: a.outcome ?? undefined,
      notes: a.notes ?? undefined,
      points: a.points,
      occurredAt: a.occurredAt.toISOString(),
    })),
  );
});

router.post('/', async (req, res) => {
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

  const points = await pointsForActivity(teamId, body.type);
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

  await refreshContactHealth(body.contactId);

  if (body.notes?.trim()) {
    await scanAndSaveCommitments({
      teamId,
      userId,
      contactId: body.contactId,
      text: body.notes.trim(),
      direction: 'mine',
      source: 'outbound',
      sourceId: activity.id,
      messageDate: occurredAt,
    });
  }

  res.status(201).json({
    id: activity.id,
    contactId: activity.contactId,
    contactName: activity.contact.name,
    company: activity.contact.company,
    type: activity.type,
    durationMin: activity.durationMin ?? undefined,
    outcome: activity.outcome ?? undefined,
    notes: activity.notes ?? undefined,
    points: activity.points,
    occurredAt: activity.occurredAt.toISOString(),
  });
});

export default router;
