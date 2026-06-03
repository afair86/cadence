import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { signToken, authMiddleware, getAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, name, teamName } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    teamName?: string;
  };

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const team = await prisma.team.create({
    data: {
      name: teamName ?? `${name}'s Team`,
      pointConfig: { create: {} },
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, teamId: team.id, role: 'BDM' },
    include: { team: true },
  });

  const token = signToken({ userId: user.id, teamId: team.id, email: user.email });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: team.id,
      teamName: team.name,
    },
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { team: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken({ userId: user.id, teamId: user.teamId, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      teamName: user.team.name,
    },
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const { userId } = getAuth(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { team: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
    teamName: user.team.name,
  });
});

export default router;
