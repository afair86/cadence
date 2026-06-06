import { Router } from 'express';
import type { CreateContactInput } from '@cadence/shared';
import { prisma } from '../db.js';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import { toContactDto } from '../services/contact.service.js';
import { computeHealth } from '../lib/helpers.js';
import { parseSectionQuery, sphereFilter } from '../lib/sections.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section as string | undefined);
  const rows = await prisma.contact.findMany({
    where: { teamId, ...sphereFilter(section) },
    orderBy: { name: 'asc' },
  });
  res.json(rows.map(toContactDto));
});

router.get('/:id', async (req, res) => {
  const { teamId } = getAuth(req);
  const row = await prisma.contact.findFirst({
    where: { id: req.params.id, teamId },
  });
  if (!row) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }
  res.json(toContactDto(row));
});

router.post('/import', async (req, res) => {
  const { teamId } = getAuth(req);
  const { contacts } = req.body as { contacts?: CreateContactInput[] };

  if (!Array.isArray(contacts) || contacts.length === 0) {
    res.status(400).json({ error: 'contacts array required' });
    return;
  }
  if (contacts.length > 500) {
    res.status(400).json({ error: 'Maximum 500 contacts per import' });
    return;
  }

  const rows = contacts
    .filter((c) => c.name?.trim())
    .map((body) => {
      const { healthScore, healthStatus } = computeHealth(null);
      return {
        teamId,
        name: body.name.trim(),
        company: body.company?.trim() || '—',
        position: body.position?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        email: body.email?.trim() || undefined,
        whatsappPhone: body.whatsappPhone?.trim() || undefined,
        instagramHandle: body.instagramHandle?.trim() || undefined,
        facebookUsername: body.facebookUsername?.trim() || undefined,
        linkedinUrl: body.linkedinUrl?.trim() || undefined,
        address: body.address?.trim() || undefined,
        tags: body.tags ?? [],
        sphere: body.sphere ?? 'business',
        preferredMethod: body.preferredMethod ?? 'call',
        preferredTimes: body.preferredTimes?.trim() || undefined,
        responseTime: body.responseTime?.trim() || undefined,
        healthScore,
        healthStatus,
      };
    });

  const skipped = contacts.length - rows.length;
  if (rows.length === 0) {
    res.json({ imported: 0, skipped: contacts.length });
    return;
  }

  const result = await prisma.contact.createMany({ data: rows });
  res.status(201).json({ imported: result.count, skipped });
});

router.post('/', async (req, res) => {
  const { teamId } = getAuth(req);
  const body = req.body as CreateContactInput;
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'Name required' });
    return;
  }

  const { healthScore, healthStatus } = computeHealth(null);
  const row = await prisma.contact.create({
    data: {
      teamId,
      name: body.name.trim(),
      company: body.company?.trim() || '—',
      position: body.position,
      phone: body.phone,
      email: body.email,
      whatsappPhone: body.whatsappPhone,
      instagramHandle: body.instagramHandle,
      facebookUsername: body.facebookUsername,
      linkedinUrl: body.linkedinUrl,
      address: body.address,
      tags: body.tags ?? [],
      sphere: body.sphere ?? 'business',
      preferredMethod: body.preferredMethod ?? 'call',
      preferredTimes: body.preferredTimes,
      responseTime: body.responseTime,
      healthScore,
      healthStatus,
    },
  });
  res.status(201).json(toContactDto(row));
});

export default router;
