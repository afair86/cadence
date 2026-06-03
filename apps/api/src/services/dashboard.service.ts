import type { DashboardData, SectionView, SmartPlanItem, Sphere } from '@cadence/shared';
import {
  buildWeeklyTimeInsights,
  smartPlanFocusFromInsights,
} from '@cadence/shared';
import { prisma } from '../db.js';
import {
  daysSince,
  greetingForHour,
  formatScheduled,
  actionLabel,
} from '../lib/helpers.js';
import { sectionMeta, sphereFilter } from '../lib/sections.js';
import { contactIdsForSection } from '../lib/sectionFilter.js';
import { generateSmartPlan } from './ai.service.js';
import { getTodayKpis, getMonthlyPoints } from './points.service.js';
import {
  buildWeeklyTimeBalance,
  remainingHoursForSection,
} from './time-budget.service.js';

export async function buildDashboard(
  userId: string,
  teamId: string,
  userName: string,
  userRole: string,
  section: SectionView = 'business',
): Promise<DashboardData> {
  const weeklyTimeAll = await buildWeeklyTimeBalance(userId, teamId, 'all');
  const weeklyInsights = buildWeeklyTimeInsights(weeklyTimeAll);
  const smartPlanFocus = smartPlanFocusFromInsights(weeklyInsights);

  const planSection: SectionView =
    section === 'all' && smartPlanFocus ? smartPlanFocus.sphere : section;

  const contacts = await prisma.contact.findMany({
    where: { teamId, ...sphereFilter(planSection) },
    include: { opportunities: { orderBy: { value: 'desc' }, take: 3 } },
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

  const smartPlan: SmartPlanItem[] = aiPlan
    .map((item, i) => {
      const c = contactMap.get(item.contactId);
      if (!c) return null;
      return {
        id: `sp-${i}`,
        contactId: c.id,
        contactName: c.name,
        company: c.company,
        priority: item.priority,
        insight: item.insight,
        scheduledTime: item.scheduledTime,
        suggestedAction: item.suggestedAction,
        actionLabel: actionLabel(item.suggestedAction),
      };
    })
    .filter(Boolean) as SmartPlanItem[];

  const kpisRaw = await getTodayKpis(userId, teamId, section);
  const monthly = await getMonthlyPoints(userId, teamId, section);
  const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}${n} vs yesterday`;

  const pendingAuto = await prisma.automation.findFirst({
    where: { status: 'pending', contact: { teamId, ...sphereFilter(section) } },
    include: { contact: true },
    orderBy: { scheduledAt: 'asc' },
  });

  const total = contacts.length || 1;
  const healthy = contacts.filter((c) => c.healthStatus === 'healthy').length;
  const cooling = contacts.filter((c) => c.healthStatus === 'cooling').length;
  const atRisk = contacts.filter((c) => c.healthStatus === 'at_risk').length;

  const allOpps = contacts.flatMap((c) =>
    c.opportunities.map((o) => ({
      id: o.id,
      company: c.company,
      value: o.value,
      stage: o.stage,
    })),
  );
  allOpps.sort((a, b) => b.value - a.value);

  const contactIds = await contactIdsForSection(teamId, section);
  const inboundUnreadWhere = contactIds
    ? { teamId, contactId: { in: contactIds }, status: 'unread' as const }
    : { teamId, status: 'unread' as const };

  const [pendingCount, unreadInboundCount] = await Promise.all([
    prisma.automation.count({
      where: { status: 'pending', contact: { teamId, ...sphereFilter(section) } },
    }),
    prisma.inboxMessage.count({ where: inboundUnreadWhere }),
  ]);
  const overdueCount = contacts.filter(
    (c) => (daysSince(c.lastContactAt) ?? 999) >= 21,
  ).length;

  const meta = sectionMeta(section);
  const weeklyTime = await buildWeeklyTimeBalance(userId, teamId, section);
  const remainingHours = remainingHoursForSection(weeklyTime, section);
  const remainingMinutes = Math.round(remainingHours * 60);

  return {
    greeting: greetingForHour(new Date().getHours()),
    userName,
    userRole,
    dateLabel: 'Today',
    ...meta,
    kpis: [
      {
        id: 'calls',
        label: 'Calls Made',
        value: kpisRaw.calls,
        delta: fmtDelta(kpisRaw.callsDelta),
        icon: 'phone',
        accent: '#22c55e',
      },
      {
        id: 'emails',
        label: 'Emails Sent',
        value: kpisRaw.emails,
        delta: fmtDelta(kpisRaw.emailsDelta),
        icon: 'mail',
        accent: '#3b82f6',
      },
      {
        id: 'meetings',
        label: 'Meetings',
        value: kpisRaw.meetings,
        delta: fmtDelta(kpisRaw.meetingsDelta),
        icon: 'meeting',
        accent: '#8b5cf6',
      },
      {
        id: 'texts',
        label: 'Texts Sent',
        value: kpisRaw.texts,
        delta: fmtDelta(kpisRaw.textsDelta),
        icon: 'message',
        accent: '#f97316',
      },
      {
        id: 'points',
        label: 'Points Today',
        value: kpisRaw.points,
        delta: `${kpisRaw.progress}% of daily target`,
        icon: 'points',
        accent: '#eab308',
        progress: kpisRaw.progress,
      },
    ],
    smartPlan,
    estimatedMinutes: Math.min(
      Math.max(smartPlan.length * 4, 10),
      Math.max(remainingMinutes, 10),
    ),
    automation: pendingAuto
      ? {
          id: pendingAuto.id,
          contactId: pendingAuto.contactId,
          contactName: pendingAuto.contact.name,
          company: pendingAuto.contact.company,
          scheduledFor: formatScheduled(pendingAuto.scheduledAt),
          message: pendingAuto.message,
          statusLabel: `Message will be sent ${formatScheduled(pendingAuto.scheduledAt)}`,
          channel: pendingAuto.channel as 'call' | 'sms' | 'email' | 'meeting',
          insight: pendingAuto.insight ?? undefined,
        }
      : null,
    relationshipHealth: {
      healthy: Math.round((healthy / total) * 100),
      cooling: Math.round((cooling / total) * 100),
      atRisk: Math.round((atRisk / total) * 100),
    },
    opportunities: allOpps.slice(0, 3),
    monthlyPoints: monthly,
    notifications: { messages: pendingCount + unreadInboundCount, alerts: overdueCount },
    weeklyTime,
    weeklyInsights,
    smartPlanFocus,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
  };
}
