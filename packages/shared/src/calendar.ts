import type { Sphere } from './sections.js';

export type CalendarEventKind = 'message' | 'activity' | 'task' | 'commitment';

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  subtitle?: string;
  contactId?: string;
  contactName?: string;
  company?: string;
  sphere: Sphere | null;
  eventType: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  status?: string;
  insight?: string;
  editable: boolean;
  link?: string;
}

export interface CalendarSummary {
  meetings: number;
  messages: number;
  tasks: number;
  commitments: number;
  total: number;
}

export interface CalendarData {
  weekStart: string;
  weekEnd: string;
  events: CalendarEvent[];
  summary: CalendarSummary;
}

export interface ScheduleEventInput {
  contactId: string;
  eventType: 'meeting' | 'call' | 'coffee' | 'site_visit' | 'message';
  startsAt: string;
  durationMin?: number;
  notes?: string;
}

export interface RescheduleEventInput {
  kind: 'message' | 'activity' | 'commitment';
  id: string;
  startsAt: string;
  durationMin?: number;
}

export function googleCalendarUrl(opts: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  details?: string;
  location?: string;
}): string {
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(opts.startsAt)}/${fmt(opts.endsAt)}`,
  });
  if (opts.details) params.set('details', opts.details);
  if (opts.location) params.set('location', opts.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(opts: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  details?: string;
}): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: opts.title,
    startdt: opts.startsAt.toISOString(),
    enddt: opts.endsAt.toISOString(),
  });
  if (opts.details) params.set('body', opts.details);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}
