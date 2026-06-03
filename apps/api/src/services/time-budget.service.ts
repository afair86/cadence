import type {
  SectionView,
  Sphere,
  TimeBudgetSettings,
  WeeklyTimeBalance,
  WeeklyTimeRow,
} from '@cadence/shared';
import {
  DEFAULT_TIME_BUDGET,
  SPHERE_LABELS,
  SPHERE_TIME_ACCENTS,
  totalWeeklyHours,
} from '@cadence/shared';
import { prisma } from '../db.js';

const DEFAULT_DURATION_MIN: Record<string, number> = {
  call: 10,
  sms: 2,
  email: 5,
  meeting: 30,
  coffee: 45,
  site_visit: 60,
  quote: 15,
  note: 3,
};

function getWeekRange(now = new Date()) {
  const start = new Date(now);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

function formatWeekLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return `${fmt(start)} – ${fmt(weekEnd)}`;
}

function roundHours(h: number): number {
  return Math.round(h * 10) / 10;
}

function buildRow(
  id: WeeklyTimeRow['id'],
  label: string,
  targetHours: number,
  spentHours: number,
  accent: string,
  highlight = false,
): WeeklyTimeRow {
  const remainingHours = Math.max(0, roundHours(targetHours - spentHours));
  const progressPercent =
    targetHours > 0 ? Math.min(100, Math.round((spentHours / targetHours) * 100)) : 0;
  return {
    id,
    label,
    targetHours,
    spentHours: roundHours(spentHours),
    remainingHours,
    progressPercent,
    accent,
    highlight,
  };
}

export async function getOrCreateTimeBudget(userId: string): Promise<TimeBudgetSettings> {
  const row = await prisma.userTimeBudget.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_TIME_BUDGET },
    update: {},
  });
  return {
    businessHoursPerWeek: row.businessHoursPerWeek,
    personalHoursPerWeek: row.personalHoursPerWeek,
    familyHoursPerWeek: row.familyHoursPerWeek,
  };
}

export async function updateTimeBudget(
  userId: string,
  input: Partial<TimeBudgetSettings>,
): Promise<TimeBudgetSettings> {
  const row = await prisma.userTimeBudget.upsert({
    where: { userId },
    create: {
      userId,
      businessHoursPerWeek: input.businessHoursPerWeek ?? DEFAULT_TIME_BUDGET.businessHoursPerWeek,
      personalHoursPerWeek: input.personalHoursPerWeek ?? DEFAULT_TIME_BUDGET.personalHoursPerWeek,
      familyHoursPerWeek: input.familyHoursPerWeek ?? DEFAULT_TIME_BUDGET.familyHoursPerWeek,
    },
    update: {
      ...(input.businessHoursPerWeek != null
        ? { businessHoursPerWeek: input.businessHoursPerWeek }
        : {}),
      ...(input.personalHoursPerWeek != null
        ? { personalHoursPerWeek: input.personalHoursPerWeek }
        : {}),
      ...(input.familyHoursPerWeek != null
        ? { familyHoursPerWeek: input.familyHoursPerWeek }
        : {}),
    },
  });
  return {
    businessHoursPerWeek: row.businessHoursPerWeek,
    personalHoursPerWeek: row.personalHoursPerWeek,
    familyHoursPerWeek: row.familyHoursPerWeek,
  };
}

export async function getWeeklySpentBySphere(
  userId: string,
  teamId: string,
): Promise<Record<Sphere, number>> {
  const { start, end } = getWeekRange();
  const activities = await prisma.activity.findMany({
    where: {
      userId,
      occurredAt: { gte: start, lte: end },
      contact: { teamId },
    },
    include: { contact: { select: { sphere: true } } },
  });

  const spent: Record<Sphere, number> = { business: 0, personal: 0, family: 0 };
  for (const activity of activities) {
    const sphere = activity.contact.sphere as Sphere;
    if (!(sphere in spent)) continue;
    const mins = activity.durationMin ?? DEFAULT_DURATION_MIN[activity.type] ?? 5;
    spent[sphere] += mins / 60;
  }
  return spent;
}

export async function buildWeeklyTimeBalance(
  userId: string,
  teamId: string,
  section: SectionView = 'all',
): Promise<WeeklyTimeBalance> {
  const [budget, spent] = await Promise.all([
    getOrCreateTimeBudget(userId),
    getWeeklySpentBySphere(userId, teamId),
  ]);

  const { start, end } = getWeekRange();
  const sphereRows: WeeklyTimeRow[] = (
    ['business', 'personal', 'family'] as Sphere[]
  ).map((sphere) =>
    buildRow(
      sphere,
      SPHERE_LABELS[sphere],
      budget[`${sphere}HoursPerWeek` as keyof TimeBudgetSettings] as number,
      spent[sphere],
      SPHERE_TIME_ACCENTS[sphere],
      section === sphere,
    ),
  );

  const totalTarget = totalWeeklyHours(budget);
  const totalSpent = spent.business + spent.personal + spent.family;
  const totalRow = buildRow('total', 'All sections', totalTarget, totalSpent, '#64748b', section === 'all');

  let rows: WeeklyTimeRow[];
  switch (section) {
    case 'business':
      rows = [sphereRows[0], totalRow];
      break;
    case 'personal':
      rows = [sphereRows[1], totalRow];
      break;
    case 'family':
      rows = [sphereRows[2], totalRow];
      break;
    default:
      rows = [...sphereRows, totalRow];
  }

  return {
    weekLabel: formatWeekLabel(start, end),
    rows,
    budget,
    totalTargetHours: totalTarget,
    totalSpentHours: roundHours(totalSpent),
    totalRemainingHours: roundHours(Math.max(0, totalTarget - totalSpent)),
  };
}

export function remainingHoursForSection(
  balance: WeeklyTimeBalance,
  section: SectionView,
): number {
  if (section === 'all') return balance.totalRemainingHours;
  const row = balance.rows.find((r) => r.id === section);
  return row?.remainingHours ?? balance.totalRemainingHours;
}
