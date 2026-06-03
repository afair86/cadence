/** Monday-start week containing the given date */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function parseWeekQuery(value?: string): Date {
  if (!value) return startOfWeek(new Date());
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return startOfWeek(new Date());
  return startOfWeek(parsed);
}

/** Parse display times like "11:15 AM" onto a base day */
export function parseDisplayTime(timeStr: string, baseDate: Date): Date {
  const d = new Date(baseDate);
  d.setSeconds(0, 0);

  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) {
    d.setHours(9, 0, 0, 0);
    return d;
  }

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (!meridiem && hours <= 7) hours += 12;

  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function defaultDurationForType(type: string): number {
  switch (type) {
    case 'meeting':
    case 'coffee':
      return 60;
    case 'site_visit':
      return 90;
    case 'call':
    case 'message':
    case 'sms':
    case 'email':
      return 15;
    default:
      return 30;
  }
}

export function eventTitleForType(type: string, contactName: string): string {
  const first = contactName.split(' ')[0];
  switch (type) {
    case 'meeting':
      return `Meeting with ${first}`;
    case 'coffee':
      return `Coffee with ${first}`;
    case 'call':
      return `Call ${first}`;
    case 'site_visit':
      return `Site visit — ${first}`;
    case 'message':
    case 'sms':
      return `Send message to ${first}`;
    case 'email':
      return `Email ${first}`;
    default:
      return `Follow up with ${first}`;
  }
}
