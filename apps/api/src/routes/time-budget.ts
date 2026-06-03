import { Router } from 'express';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import { buildWeeklyTimeBalance, getOrCreateTimeBudget, updateTimeBudget } from '../services/time-budget.service.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const [settings, balance] = await Promise.all([
    getOrCreateTimeBudget(userId),
    buildWeeklyTimeBalance(userId, teamId, 'all'),
  ]);
  res.json({ settings, balance });
});

router.patch('/', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const { businessHoursPerWeek, personalHoursPerWeek, familyHoursPerWeek } = req.body ?? {};

  const parseHours = (v: unknown) => {
    if (v == null) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 168) return null;
    return n;
  };

  const business = parseHours(businessHoursPerWeek);
  const personal = parseHours(personalHoursPerWeek);
  const family = parseHours(familyHoursPerWeek);

  if (business === null || personal === null || family === null) {
    res.status(400).json({ error: 'Hours must be between 0 and 168' });
    return;
  }

  const settings = await updateTimeBudget(userId, {
    businessHoursPerWeek: business,
    personalHoursPerWeek: personal,
    familyHoursPerWeek: family,
  });
  const balance = await buildWeeklyTimeBalance(userId, teamId, 'all');
  res.json({ settings, balance });
});

export default router;
