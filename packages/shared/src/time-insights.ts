import type { Sphere } from './sections.js';
import { SPHERE_LABELS } from './sections.js';
import type { WeeklyTimeBalance } from './time-budget.js';
export type TimePaceStatus = 'ahead' | 'on_track' | 'light' | 'behind' | 'none';

export interface SectionTimeStatus {
  sphere: Sphere;
  label: string;
  status: TimePaceStatus;
  message: string;
}

export interface TimeNudge {
  id: string;
  sphere: Sphere;
  message: string;
  severity: 'info' | 'warning';
}

export interface WeeklyTimeSummary {
  headline: string;
  sections: SectionTimeStatus[];
  mostBehindSphere: Sphere | null;
}

export interface SmartPlanFocus {
  sphere: Sphere;
  label: string;
  reason: string;
}

export interface WeeklyTimeInsights {
  nudges: TimeNudge[];
  summary: WeeklyTimeSummary;
  daysElapsed: number;
  weekProgressPercent: number;
}

/** Monday = 0 … Sunday = 6 */
export function daysSinceMonday(now = new Date()): number {
  return (now.getDay() + 6) % 7;
}

function weekFraction(dayIndex: number): number {
  return (dayIndex + 1) / 7;
}

function paceStatus(
  spentHours: number,
  targetHours: number,
  dayIndex: number,
): TimePaceStatus {
  if (targetHours <= 0) return 'none';
  const expected = targetHours * weekFraction(dayIndex);
  if (spentHours >= targetHours * 0.95) return 'ahead';
  if (spentHours >= expected * 0.85) return 'on_track';
  if (spentHours === 0 && dayIndex >= 3) return 'behind';
  if (spentHours < expected * 0.5) return 'light';
  return 'on_track';
}

function buildHeadline(sections: SectionTimeStatus[]): string {
  const active = sections.filter((s) => s.status !== 'none');
  if (active.length === 0) return 'Set your weekly hours to start tracking balance';

  const weak = active.filter((s) => s.status === 'light' || s.status === 'behind');
  const good = active.filter((s) => s.status === 'ahead' || s.status === 'on_track');

  if (weak.length === 0) {
    return `Good week — ${good.map((s) => s.label.toLowerCase()).join(' and ')} on track`;
  }

  const goodPart = good.map((s) => s.label.toLowerCase()).join(' and ');
  const weakPart = weak
    .map((s) =>
      s.status === 'behind'
        ? `behind on ${s.label.toLowerCase()}`
        : `light on ${s.label.toLowerCase()}`,
    )
    .join(', ');

  if (goodPart) {
    return `You hit ${goodPart}, ${weakPart}`;
  }
  return `This week: ${weakPart}`;
}

function findMostBehind(
  rows: WeeklyTimeBalance['rows'],
  dayIndex: number,
): Sphere | null {
  const spheres = rows.filter((r): r is WeeklyTimeBalance['rows'][number] & { id: Sphere } =>
    r.id === 'business' || r.id === 'personal' || r.id === 'family',
  );

  let worst: { sphere: Sphere; score: number } | null = null;
  for (const row of spheres) {
    if (row.targetHours <= 0) continue;
    const expected = row.targetHours * weekFraction(dayIndex);
    const deficit = Math.max(0, expected - row.spentHours);
    const score = deficit / row.targetHours;
    if (!worst || score > worst.score) {
      worst = { sphere: row.id, score };
    }
  }
  return worst && worst.score > 0.05 ? worst.sphere : null;
}

export function buildWeeklyTimeInsights(
  balance: WeeklyTimeBalance,
  now = new Date(),
): WeeklyTimeInsights {
  const dayIndex = daysSinceMonday(now);
  const weekProgressPercent = Math.round(weekFraction(dayIndex) * 100);

  const sphereRows = balance.rows.filter(
    (r): r is typeof r & { id: Sphere } =>
      r.id === 'business' || r.id === 'personal' || r.id === 'family',
  );

  const sections: SectionTimeStatus[] = sphereRows.map((row) => {
    const status = paceStatus(row.spentHours, row.targetHours, dayIndex);
    let message = '';
    switch (status) {
      case 'ahead':
        message = `${row.spentHours}h logged — ahead of pace`;
        break;
      case 'on_track':
        message = `${row.spentHours}h of ${row.targetHours}h — on track`;
        break;
      case 'light':
        message = `Only ${row.spentHours}h so far — aim for ${row.targetHours}h this week`;
        break;
      case 'behind':
        message = `No time logged yet — ${row.targetHours}h planned this week`;
        break;
      default:
        message = '';
    }
    return { sphere: row.id, label: row.label, status, message };
  });

  const nudges: TimeNudge[] = [];
  const family = sphereRows.find((r) => r.id === 'family');
  if (
    family &&
    family.targetHours > 0 &&
    family.spentHours === 0 &&
    dayIndex >= 3
  ) {
    nudges.push({
      id: 'family-zero-thursday',
      sphere: 'family',
      message:
        'You haven’t logged any family time this week. Even a quick call counts — block 30 minutes?',
      severity: 'warning',
    });
  }

  const mostBehind = findMostBehind(balance.rows, dayIndex);
  const sectionBySphere = new Map(sections.map((s) => [s.sphere, s]));

  if (mostBehind && mostBehind !== 'family') {
    const sectionStatus = sectionBySphere.get(mostBehind);
    if (sectionStatus && (sectionStatus.status === 'light' || sectionStatus.status === 'behind')) {
      nudges.push({
        id: `behind-${mostBehind}`,
        sphere: mostBehind,
        message: `${sectionStatus.label} is most behind your weekly plan — today’s suggestions focus here.`,
        severity: 'info',
      });
    }
  } else if (mostBehind === 'family' && family && family.spentHours > 0) {
    nudges.push({
      id: 'behind-family',
      sphere: 'family',
      message: 'Family is most behind your weekly plan — today’s suggestions focus here.',
      severity: 'info',
    });
  }

  return {
    nudges,
    summary: {
      headline: buildHeadline(sections),
      sections,
      mostBehindSphere: mostBehind,
    },
    daysElapsed: dayIndex + 1,
    weekProgressPercent,
  };
}

export function smartPlanFocusFromInsights(
  insights: WeeklyTimeInsights,
): SmartPlanFocus | null {
  const sphere = insights.summary.mostBehindSphere;
  if (!sphere) return null;
  return {
    sphere,
    label: SPHERE_LABELS[sphere],
    reason: `${SPHERE_LABELS[sphere]} is most behind your weekly plan`,
  };
}
