import type { HealthStatus } from '@cadence/shared';

export function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function computeHealth(lastContactAt: Date | null): {
  healthScore: number;
  healthStatus: HealthStatus;
} {
  const days = daysSince(lastContactAt);
  if (days === null) {
    return { healthScore: 50, healthStatus: 'cooling' };
  }
  if (days <= 7) return { healthScore: 85, healthStatus: 'healthy' };
  if (days <= 14) return { healthScore: 72, healthStatus: 'healthy' };
  if (days <= 21) return { healthScore: 58, healthStatus: 'cooling' };
  if (days <= 30) return { healthScore: 42, healthStatus: 'cooling' };
  return { healthScore: 25, healthStatus: 'at_risk' };
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatScheduled(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const day = isToday
    ? 'Today'
    : date.toLocaleDateString('en-AU', { weekday: 'short' });
  return `${day} ${formatTime(date)}`;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function actionLabel(method: string): string {
  const labels: Record<string, string> = {
    call: 'Call Now',
    sms: 'Send Text',
    email: 'Send Email',
    meeting: 'Schedule Meeting',
  };
  return labels[method] ?? 'Contact';
}

export function priorityFromHealth(status: string, days: number | null): 'high' | 'medium' | 'low' {
  if (status === 'at_risk' || (days !== null && days >= 21)) return 'high';
  if (status === 'cooling' || (days !== null && days >= 14)) return 'medium';
  return 'low';
}

export function ruleBasedInsight(
  name: string,
  days: number | null,
  preferredTimes?: string | null,
  healthStatus?: string,
): string {
  if (days !== null && days >= 21) {
    return `Relationship check-in: No contact in ${days} days`;
  }
  if (preferredTimes) {
    return `Best time to reach: ${preferredTimes}`;
  }
  if (healthStatus === 'cooling') {
    return `Relationship cooling: Touch base with ${name.split(' ')[0]}`;
  }
  return `Follow up required: Stay on cadence with ${name.split(' ')[0]}`;
}

export function suggestScheduledTime(preferredTimes?: string | null): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  if (preferredTimes?.toLowerCase().includes('11')) {
    d.setHours(11, 15, 0, 0);
  } else if (preferredTimes?.toLowerCase().includes('afternoon')) {
    d.setHours(14, 0, 0, 0);
  } else {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }
  if (d.getTime() < Date.now()) {
    d.setHours(d.getHours() + 2);
  }
  return d;
}
