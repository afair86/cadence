import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import { buildDashboard } from '../services/dashboard.service.js';
import { parseSectionQuery } from '../lib/sections.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section as string | undefined);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const data = await buildDashboard(userId, teamId, user.name, user.role, section);
  res.json(data);
});

export default router;
