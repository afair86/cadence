import { Router } from 'express';
import type { CreateCommitmentInput, ScanCommitmentInput } from '@cadence/shared';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import { parseSectionQuery } from '../lib/sections.js';
import {
  buildCommitmentsList,
  completeCommitment,
  confirmCommitment,
  createManualCommitment,
  dismissCommitment,
  scanAndSaveCommitments,
  updateCommitmentDue,
} from '../services/commitment.service.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section as string | undefined);
  const data = await buildCommitmentsList(userId, teamId, section);
  res.json(data);
});

router.post('/', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body as CreateCommitmentInput;

  if (!body.title?.trim() || !body.dueAt) {
    res.status(400).json({ error: 'title and dueAt required' });
    return;
  }

  try {
    const row = await createManualCommitment(teamId, userId, body);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/scan', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body as ScanCommitmentInput;

  if (!body.text?.trim()) {
    res.status(400).json({ error: 'text required' });
    return;
  }

  try {
    const saved = await scanAndSaveCommitments({
      teamId,
      userId,
      contactId: body.contactId,
      text: body.text.trim(),
      direction: body.direction ?? 'theirs',
      source: body.source ?? 'manual',
      sourceId: body.sourceId,
    });
    res.status(201).json({ created: saved.length, commitments: saved });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch('/:id/confirm', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  try {
    const row = await confirmCommitment(teamId, userId, req.params.id);
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.patch('/:id/done', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  try {
    const row = await completeCommitment(teamId, userId, req.params.id);
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.patch('/:id/dismiss', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  try {
    const row = await dismissCommitment(teamId, userId, req.params.id);
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.patch('/:id/due', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const { dueAt } = req.body as { dueAt?: string };
  if (!dueAt) {
    res.status(400).json({ error: 'dueAt required' });
    return;
  }
  try {
    const row = await updateCommitmentDue(teamId, userId, req.params.id, dueAt);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
