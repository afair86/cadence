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

router.post('/', async (req, res) => {
  const { teamId } = getAuth(req);
  const body = req.body as CreateContactInput;
  if (!body.name || !body.company) {
    res.status(400).json({ error: 'Name and company required' });
    return;
  }

  const { healthScore, healthStatus } = computeHealth(null);
  const row = await prisma.contact.create({
    data: {
      teamId,
      name: body.name,
      company: body.company,
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
