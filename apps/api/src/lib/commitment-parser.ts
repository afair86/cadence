/** Rule-based due date parsing from natural language */
export function parseDuePhrase(text: string, baseDate = new Date()): Date | null {
  const lower = text.toLowerCase();
  const d = new Date(baseDate);
  d.setSeconds(0, 0);

  if (/\btonight\b|\bthis evening\b|\bby end of day\b|\beod\b/.test(lower)) {
    d.setHours(20, 0, 0, 0);
    if (d.getTime() < baseDate.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }

  if (/\btomorrow\b/.test(lower)) {
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  }

  if (/\basap\b|\bas soon as possible\b|\burgent\b/.test(lower)) {
    d.setHours(d.getHours() + 4, 0, 0, 0);
    if (d.getHours() < 9) d.setHours(9, 0, 0, 0);
    return d;
  }

  if (/\btoday\b|\bthis afternoon\b/.test(lower)) {
    d.setHours(17, 0, 0, 0);
    if (d.getTime() < baseDate.getTime()) d.setHours(baseDate.getHours() + 2, 0, 0, 0);
    return d;
  }

  if (/\bend of (the )?week\b|\bthis week\b|\bby friday\b/.test(lower)) {
    const day = d.getDay();
    const daysUntilFriday = day <= 5 ? 5 - day : 5 + (7 - day);
    d.setDate(d.getDate() + daysUntilFriday);
    d.setHours(17, 0, 0, 0);
    return d;
  }

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < weekdays.length; i++) {
    if (lower.includes(weekdays[i])) {
      const target = i;
      let diff = target - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      d.setHours(17, 0, 0, 0);
      return d;
    }
  }

  const inDays = lower.match(/\b(?:in|within)\s+(\d+)\s+days?\b/);
  if (inDays) {
    d.setDate(d.getDate() + Number(inDays[1]));
    d.setHours(17, 0, 0, 0);
    return d;
  }

  const byDate = lower.match(/\bby\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (byDate) {
    const day = Number(byDate[1]);
    const month = Number(byDate[2]) - 1;
    const year = byDate[3] ? Number(byDate[3].length === 2 ? `20${byDate[3]}` : byDate[3]) : d.getFullYear();
    const parsed = new Date(year, month, day, 17, 0, 0, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

const MINE_PATTERNS = [
  /\bi['']?ll\b/i,
  /\bi will\b/i,
  /\bget onto\b/i,
  /\bget on to\b/i,
  /\bsend (you|it|that|the)\b/i,
  /\bupdate (you|them)\b/i,
  /\bfollow up\b/i,
  /\bby tonight\b/i,
  /\bby tomorrow\b/i,
  /\bwill do\b/i,
  /\bleave it with me\b/i,
];

const THEIRS_PATTERNS = [
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bplease (update|send|review|check|confirm|call|email)\b/i,
  /\bneed you to\b/i,
  /\bwhen can you\b/i,
  /\bany update\b/i,
  /\bcan i get\b/i,
  /\bwaiting on\b/i,
  /\blet me know\b/i,
];

export function ruleDetectCommitments(
  text: string,
  direction: 'mine' | 'theirs',
  baseDate = new Date(),
): Array<{ title: string; dueAt: Date; direction: 'mine' | 'theirs'; sourceQuote: string }> {
  const trimmed = text.trim();
  if (trimmed.length < 8) return [];

  const patterns = direction === 'mine' ? MINE_PATTERNS : THEIRS_PATTERNS;
  const matched = patterns.some((p) => p.test(trimmed));
  if (!matched) return [];

  const dueAt = parseDuePhrase(trimmed, baseDate) ?? defaultDue(direction, baseDate);

  let title = trimmed.slice(0, 100);
  if (title.length >= 100) title = `${title.slice(0, 97)}…`;

  if (direction === 'theirs') {
    title = title.replace(/^(can you|could you|please)\s+/i, '');
    title = `Respond: ${title.charAt(0).toUpperCase()}${title.slice(1)}`;
  } else {
    title = `Follow up: ${title.charAt(0).toUpperCase()}${title.slice(1)}`;
  }

  const quote =
    trimmed.length <= 120 ? trimmed : `${trimmed.slice(0, 117)}…`;

  return [{ title, dueAt, direction, sourceQuote: quote }];
}

function defaultDue(direction: 'mine' | 'theirs', baseDate: Date): Date {
  const d = new Date(baseDate);
  if (direction === 'mine') {
    d.setHours(20, 0, 0, 0);
    if (d.getTime() < baseDate.getTime()) {
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
    }
  } else {
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
  }
  return d;
}
