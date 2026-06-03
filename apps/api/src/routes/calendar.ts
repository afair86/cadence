import { Router } from 'express';
import type { RescheduleEventInput, ScheduleEventInput, SectionView } from '@cadence/shared';
import { authMiddleware, getAuth } from '../middleware/auth.js';
import { parseSectionQuery } from '../lib/sections.js';
import { parseWeekQuery } from '../lib/calendar-helpers.js';
import {
  buildCalendar,
  planWeekFromSmartTasks,
  rescheduleCalendarEvent,
  scheduleCalendarEvent,
} from '../services/calendar.service.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section as string | undefined);
  const week = parseWeekQuery(req.query.week as string | undefined);

  const data = await buildCalendar(userId, teamId, section, week);
  res.json(data);
});

router.post('/schedule', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body as ScheduleEventInput;

  if (!body.contactId || !body.eventType || !body.startsAt) {
    res.status(400).json({ error: 'contactId, eventType, and startsAt required' });
    return;
  }

  try {
    const event = await scheduleCalendarEvent(userId, teamId, body);
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch('/reschedule', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body as RescheduleEventInput;

  if (!body.kind || !body.id || !body.startsAt) {
    res.status(400).json({ error: 'kind, id, and startsAt required' });
    return;
  }

  if (!['message', 'activity', 'commitment'].includes(body.kind)) {
    res.status(400).json({ error: 'Invalid kind' });
    return;
  }

  try {
    const event = await rescheduleCalendarEvent(
      teamId,
      userId,
      body.kind,
      body.id,
      body.startsAt,
      body.durationMin,
    );
    res.json(event);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/plan-week', async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section as SectionView | undefined);

  try {
    const events = await planWeekFromSmartTasks(userId, teamId, section);
    res.status(201).json({ created: events.length, events });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
