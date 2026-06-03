import type { CalendarData, CalendarEvent, CalendarSummary, SectionView, Sphere } from '@cadence/shared';
import { smartPlanFocusFromInsights, buildWeeklyTimeInsights } from '@cadence/shared';
import { prisma } from '../db.js';
import { daysSince, actionLabel } from '../lib/helpers.js';
import {
  addDays,
  defaultDurationForType,
  endOfWeek,
  eventTitleForType,
  parseDisplayTime,
  startOfWeek,
} from '../lib/calendar-helpers.js';
import { sphereFilter } from '../lib/sections.js';
import { activityFilter, contactIdsForSection } from '../lib/sectionFilter.js';
import { generateSmartPlan } from './ai.service.js';
import { buildWeeklyTimeBalance } from './time-budget.service.js';
import { pointsForActivity } from './points.service.js';
import { updateCommitmentDue } from './commitment.service.js';

function withEnd(start: Date, durationMin: number): Date {
  return new Date(start.getTime() + durationMin * 60_000);
}

function toEvent(
  partial: Omit<CalendarEvent, 'endsAt' | 'durationMin'> & { durationMin?: number },
): CalendarEvent {
  const durationMin = partial.durationMin ?? defaultDurationForType(partial.eventType);
  const startsAt = partial.startsAt;
  return {
    ...partial,
    durationMin,
    endsAt: withEnd(new Date(startsAt), durationMin).toISOString(),
  };
}

async function buildSmartPlanEvents(
  userId: string,
  teamId: string,
  section: SectionView,
  weekStart: Date,
  weekEnd: Date,
): Promise<CalendarEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (today < weekStart || today > weekEnd) return [];

  const weeklyTimeAll = await buildWeeklyTimeBalance(userId, teamId, 'all');
  const smartPlanFocus = smartPlanFocusFromInsights(buildWeeklyTimeInsights(weeklyTimeAll));
  const planSection: SectionView =
    section === 'all' && smartPlanFocus ? smartPlanFocus.sphere : section;

  const contacts = await prisma.contact.findMany({
    where: { teamId, ...sphereFilter(planSection) },
    orderBy: { healthScore: 'asc' },
    take: 10,
  });

  const contactContexts = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    preferredMethod: c.preferredMethod,
    preferredTimes: c.preferredTimes,
    healthStatus: c.healthStatus,
    lastContactDaysAgo: daysSince(c.lastContactAt),
    tags: c.tags,
    sphere: c.sphere as Sphere,
  }));

  const aiPlan = await generateSmartPlan(contactContexts, smartPlanFocus?.sphere ?? null);
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  return aiPlan
    .map((item, i) => {
      const c = contactMap.get(item.contactId);
      if (!c) return null;
      const starts = parseDisplayTime(item.scheduledTime, today);
      return toEvent({
        id: `task-${i}-${c.id}`,
        kind: 'task',
        title: `${actionLabel(item.suggestedAction)} — ${c.name}`,
        subtitle: c.company,
        contactId: c.id,
        contactName: c.name,
        company: c.company,
        sphere: c.sphere as Sphere,
        eventType: item.suggestedAction,
        startsAt: starts.toISOString(),
        durationMin: defaultDurationForType(item.suggestedAction),
        status: item.priority,
        insight: item.insight,
        editable: false,
        link: '/smart-tasks',
      });
    })
    .filter(Boolean) as CalendarEvent[];
}

export async function buildCalendar(
  userId: string,
  teamId: string,
  section: SectionView,
  weekStartInput: Date,
): Promise<CalendarData> {
  const weekStart = startOfWeek(weekStartInput);
  const weekEnd = endOfWeek(weekStart);
  const contactIds = await contactIdsForSection(teamId, section);
  const contactFilter = contactIds
    ? { teamId, id: { in: contactIds } }
    : { teamId };

  const [automations, activities, smartTasks, commitments] = await Promise.all([
    prisma.automation.findMany({
      where: {
        status: { in: ['pending', 'scheduled'] },
        scheduledAt: { gte: weekStart, lte: weekEnd },
        contact: contactFilter,
      },
      include: { contact: true },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.activity.findMany({
      where: {
        ...activityFilter(userId, teamId, contactIds),
        occurredAt: { gte: weekStart, lte: weekEnd },
      },
      include: { contact: true },
      orderBy: { occurredAt: 'asc' },
    }),
    buildSmartPlanEvents(userId, teamId, section, weekStart, weekEnd),
    prisma.commitment.findMany({
      where: {
        userId,
        status: { in: ['suggested', 'open'] },
        dueAt: { gte: weekStart, lte: weekEnd },
        ...(contactIds ? { contactId: { in: contactIds } } : { teamId }),
      },
      include: { contact: true },
      orderBy: { dueAt: 'asc' },
    }),
  ]);

  const messageEvents: CalendarEvent[] = automations.map((a) =>
    toEvent({
      id: a.id,
      kind: 'message',
      title: eventTitleForType(a.channel, a.contact.name),
      subtitle: a.message.slice(0, 80) + (a.message.length > 80 ? '…' : ''),
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      sphere: a.contact.sphere as Sphere,
      eventType: 'message',
      startsAt: a.scheduledAt.toISOString(),
      durationMin: 15,
      status: a.status,
      insight: a.insight ?? undefined,
      editable: true,
      link: '/messages',
    }),
  );

  const activityEvents: CalendarEvent[] = activities.map((a) =>
    toEvent({
      id: a.id,
      kind: 'activity',
      title: eventTitleForType(a.type, a.contact.name),
      subtitle: a.notes ?? undefined,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      sphere: a.contact.sphere as Sphere,
      eventType: a.type,
      startsAt: a.occurredAt.toISOString(),
      durationMin: a.durationMin ?? defaultDurationForType(a.type),
      editable: true,
      link: '/activities',
    }),
  );

  const commitmentEvents: CalendarEvent[] = commitments.map((c) =>
    toEvent({
      id: c.id,
      kind: 'commitment',
      title: c.title,
      subtitle: c.sourceQuote ?? undefined,
      contactId: c.contactId ?? undefined,
      contactName: c.contact?.name,
      company: c.contact?.company,
      sphere: (c.contact?.sphere as Sphere) ?? null,
      eventType: c.direction === 'mine' ? 'promise' : 'request',
      startsAt: c.dueAt.toISOString(),
      durationMin: 30,
      status: c.status,
      insight: c.direction === 'mine' ? 'You promised this' : 'They asked for this',
      editable: true,
      link: '/commitments',
    }),
  );

  const events = [...messageEvents, ...activityEvents, ...smartTasks, ...commitmentEvents].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const summary: CalendarSummary = {
    meetings: events.filter((e) => ['meeting', 'coffee', 'site_visit'].includes(e.eventType)).length,
    messages: events.filter((e) => e.kind === 'message').length,
    tasks: events.filter((e) => e.kind === 'task').length,
    commitments: events.filter((e) => e.kind === 'commitment').length,
    total: events.length,
  };

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    events,
    summary,
  };
}

export async function scheduleCalendarEvent(
  userId: string,
  teamId: string,
  input: {
    contactId: string;
    eventType: string;
    startsAt: string;
    durationMin?: number;
    notes?: string;
  },
) {
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, teamId },
  });
  if (!contact) throw new Error('Contact not found');

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error('Invalid date');

  if (input.eventType === 'message') {
    const scheduledAt = startsAt;
    const automation = await prisma.automation.create({
      data: {
        contactId: contact.id,
        channel: contact.preferredMethod === 'email' ? 'email' : 'sms',
        message: input.notes?.trim() || `Follow up with ${contact.name.split(' ')[0]}`,
        insight: 'Scheduled from calendar',
        scheduledAt,
        status: 'scheduled',
      },
      include: { contact: true },
    });
    return toEvent({
      id: automation.id,
      kind: 'message',
      title: eventTitleForType('message', contact.name),
      contactId: contact.id,
      contactName: contact.name,
      company: contact.company,
      sphere: contact.sphere as Sphere,
      eventType: 'message',
      startsAt: automation.scheduledAt.toISOString(),
      durationMin: input.durationMin ?? 15,
      status: automation.status,
      editable: true,
      link: '/messages',
    });
  }

  const type = input.eventType === 'call' ? 'call' : input.eventType;
  const points = await pointsForActivity(teamId, type as import('@cadence/shared').ActivityType);
  const activity = await prisma.activity.create({
    data: {
      userId,
      contactId: contact.id,
      type,
      durationMin: input.durationMin ?? defaultDurationForType(type),
      notes: input.notes,
      points,
      occurredAt: startsAt,
    },
    include: { contact: true },
  });

  return toEvent({
    id: activity.id,
    kind: 'activity',
    title: eventTitleForType(type, contact.name),
    subtitle: activity.notes ?? undefined,
    contactId: contact.id,
    contactName: contact.name,
    company: contact.company,
    sphere: contact.sphere as Sphere,
    eventType: type,
    startsAt: activity.occurredAt.toISOString(),
    durationMin: activity.durationMin ?? defaultDurationForType(type),
    editable: true,
    link: '/activities',
  });
}

export async function rescheduleCalendarEvent(
  teamId: string,
  userId: string,
  kind: 'message' | 'activity' | 'commitment',
  id: string,
  startsAt: string,
  durationMin?: number,
) {
  const when = new Date(startsAt);
  if (Number.isNaN(when.getTime())) throw new Error('Invalid date');

  if (kind === 'commitment') {
    const c = await updateCommitmentDue(teamId, userId, id, startsAt);
    return toEvent({
      id: c.id,
      kind: 'commitment',
      title: c.title,
      subtitle: c.sourceQuote,
      contactId: c.contactId ?? undefined,
      contactName: c.contactName,
      company: c.company,
      sphere: c.sphere,
      eventType: c.direction === 'mine' ? 'promise' : 'request',
      startsAt: c.dueAt,
      durationMin: 30,
      status: c.status,
      editable: true,
      link: '/commitments',
    });
  }

  if (kind === 'message') {
    const auto = await prisma.automation.findFirst({
      where: { id, contact: { teamId } },
      include: { contact: true },
    });
    if (!auto) throw new Error('Event not found');
    const updated = await prisma.automation.update({
      where: { id: auto.id },
      data: { scheduledAt: when },
      include: { contact: true },
    });
    return toEvent({
      id: updated.id,
      kind: 'message',
      title: eventTitleForType('message', updated.contact.name),
      contactId: updated.contactId,
      contactName: updated.contact.name,
      company: updated.contact.company,
      sphere: updated.contact.sphere as Sphere,
      eventType: 'message',
      startsAt: updated.scheduledAt.toISOString(),
      durationMin: durationMin ?? 15,
      status: updated.status,
      editable: true,
      link: '/messages',
    });
  }

  const activity = await prisma.activity.findFirst({
    where: { id, userId, contact: { teamId } },
    include: { contact: true },
  });
  if (!activity) throw new Error('Event not found');

  const updated = await prisma.activity.update({
    where: { id: activity.id },
    data: {
      occurredAt: when,
      durationMin: durationMin ?? activity.durationMin,
    },
    include: { contact: true },
  });

  return toEvent({
    id: updated.id,
    kind: 'activity',
    title: eventTitleForType(updated.type, updated.contact.name),
    contactId: updated.contactId,
    contactName: updated.contact.name,
    company: updated.contact.company,
    sphere: updated.contact.sphere as Sphere,
    eventType: updated.type,
    startsAt: updated.occurredAt.toISOString(),
    durationMin: updated.durationMin ?? defaultDurationForType(updated.type),
    editable: true,
    link: '/activities',
  });
}

/** Spread smart tasks across remaining weekdays as scheduled activities */
export async function planWeekFromSmartTasks(
  userId: string,
  teamId: string,
  section: SectionView,
) {
  const weekStart = startOfWeek(new Date());
  const data = await buildCalendar(userId, teamId, section, weekStart);
  const tasks = data.events.filter((e) => e.kind === 'task').slice(0, 5);
  if (tasks.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let dayOffset = 0;
  const created: CalendarEvent[] = [];

  for (const task of tasks) {
    let slotDay = addDays(today, dayOffset);
    while (slotDay.getDay() === 0 || slotDay.getDay() === 6) {
      dayOffset += 1;
      slotDay = addDays(today, dayOffset);
    }

    const starts = parseDisplayTime(
      new Date(task.startsAt).toLocaleTimeString('en-AU', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      slotDay,
    );

    const event = await scheduleCalendarEvent(userId, teamId, {
      contactId: task.contactId!,
      eventType: task.eventType === 'message' || task.eventType === 'email' ? 'call' : task.eventType,
      startsAt: starts.toISOString(),
      durationMin: task.durationMin,
      notes: task.insight,
    });
    created.push(event);
    dayOffset += 1;
  }

  return created;
}
