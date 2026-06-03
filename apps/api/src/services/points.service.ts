import type { ActivityType } from '@cadence/shared';
import type { SectionView } from '@cadence/shared';
import { prisma } from '../db.js';
import { computeHealth } from '../lib/helpers.js';
import { activityFilter, contactIdsForSection } from '../lib/sectionFilter.js';

const TYPE_TO_FIELD: Record<ActivityType, keyof Awaited<ReturnType<typeof getPointConfig>>> = {
  call: 'call',
  sms: 'sms',
  email: 'email',
  meeting: 'meeting',
  coffee: 'coffee',
  site_visit: 'siteVisit',
  quote: 'quote',
  note: 'note',
};

async function getPointConfig(teamId: string) {
  return (
    (await prisma.pointConfig.findUnique({ where: { teamId } })) ?? {
      call: 1,
      sms: 0.5,
      email: 0.5,
      meeting: 2,
      coffee: 2,
      siteVisit: 1.5,
      quote: 0.5,
      note: 0.25,
      dailyTarget: 15,
      monthlyTarget: 15,
    }
  );
}

export async function pointsForActivity(teamId: string, type: ActivityType): Promise<number> {
  const config = await getPointConfig(teamId);
  const field = TYPE_TO_FIELD[type];
  return config[field] as number;
}

export async function refreshContactHealth(contactId: string) {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return;

  const lastActivity = await prisma.activity.findFirst({
    where: { contactId },
    orderBy: { occurredAt: 'desc' },
  });

  const lastContactAt = lastActivity?.occurredAt ?? contact.lastContactAt;
  const { healthScore, healthStatus } = computeHealth(lastContactAt);

  await prisma.contact.update({
    where: { id: contactId },
    data: { healthScore, healthStatus, lastContactAt },
  });
}

export async function getTodayKpis(userId: string, teamId: string, section: SectionView = 'business') {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(start);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(end);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const contactIds = await contactIdsForSection(teamId, section);
  const baseWhere = activityFilter(userId, teamId, contactIds);

  const [today, yesterday, config] = await Promise.all([
    prisma.activity.findMany({
      where: { ...baseWhere, occurredAt: { gte: start, lte: end } },
    }),
    prisma.activity.findMany({
      where: { ...baseWhere, occurredAt: { gte: yesterdayStart, lte: yesterdayEnd } },
    }),
    getPointConfig(teamId),
  ]);

  const countBy = (items: typeof today, type: string) =>
    items.filter((a) => a.type === type).length;

  const points = (items: typeof today) =>
    items.reduce((sum, a) => sum + a.points, 0);

  const todayPoints = points(today);
  const progress = Math.min(100, Math.round((todayPoints / config.dailyTarget) * 100));

  return {
    calls: countBy(today, 'call'),
    callsDelta: countBy(today, 'call') - countBy(yesterday, 'call'),
    emails: countBy(today, 'email'),
    emailsDelta: countBy(today, 'email') - countBy(yesterday, 'email'),
    meetings: countBy(today, 'meeting') + countBy(today, 'coffee'),
    meetingsDelta:
      countBy(today, 'meeting') +
      countBy(today, 'coffee') -
      (countBy(yesterday, 'meeting') + countBy(yesterday, 'coffee')),
    texts: countBy(today, 'sms'),
    textsDelta: countBy(today, 'sms') - countBy(yesterday, 'sms'),
    points: todayPoints,
    progress,
    dailyTarget: config.dailyTarget,
  };
}

export async function getMonthlyPoints(userId: string, teamId: string, section: SectionView = 'business') {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const contactIds = await contactIdsForSection(teamId, section);
  const baseWhere = activityFilter(userId, teamId, contactIds);

  const [activities, config] = await Promise.all([
    prisma.activity.findMany({
      where: { ...baseWhere, occurredAt: { gte: start, lte: end } },
    }),
    getPointConfig(teamId),
  ]);

  const current = activities.reduce((sum, a) => sum + a.points, 0);
  const daysRemaining = end.getDate() - now.getDate();

  return { current, target: config.monthlyTarget, daysRemaining };
}
