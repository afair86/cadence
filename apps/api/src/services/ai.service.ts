import OpenAI from 'openai';
import type { ContactMethod, Sphere } from '@cadence/shared';
import { SPHERE_LABELS } from '@cadence/shared';
import {
  ruleBasedInsight,
  suggestScheduledTime,
  formatTime,
  actionLabel,
} from '../lib/helpers.js';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface ContactContext {
  id: string;
  name: string;
  company: string;
  preferredMethod: string;
  preferredTimes?: string | null;
  healthStatus: string;
  lastContactDaysAgo: number | null;
  tags: string[];
  sphere?: Sphere;
}

export interface AiPlanItem {
  contactId: string;
  insight: string;
  scheduledTime: string;
  suggestedAction: ContactMethod;
  priority: 'high' | 'medium' | 'low';
}

export async function generateSmartPlan(
  contacts: ContactContext[],
  focusSphere: Sphere | null = null,
): Promise<AiPlanItem[]> {
  const sorted = focusSphere
    ? [...contacts].sort((a, b) => {
        const aFocus = a.sphere === focusSphere ? 0 : 1;
        const bFocus = b.sphere === focusSphere ? 0 : 1;
        if (aFocus !== bFocus) return aFocus - bFocus;
        return (b.lastContactDaysAgo ?? 0) - (a.lastContactDaysAgo ?? 0);
      })
    : contacts;

  if (!openai || sorted.length === 0) {
    return sorted.map((c) => buildRulePlanItem(c, focusSphere));
  }

  try {
    const focusNote = focusSphere
      ? `\nPrioritize contacts in the ${SPHERE_LABELS[focusSphere]} section — it is most behind the weekly time plan.`
      : '';

    const prompt = `You are a relationship assistant. For each contact, suggest one follow-up action.${focusNote}
Return JSON object with key "items": array of { "contactId", "insight" (short, actionable), "scheduledTime" (like "11:15 AM"), "suggestedAction" ("call"|"sms"|"email"|"meeting"), "priority" ("high"|"medium"|"low") }

Contacts:
${JSON.stringify(sorted, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { items?: AiPlanItem[]; plan?: AiPlanItem[] };
    const items = parsed.items ?? parsed.plan ?? (Array.isArray(parsed) ? parsed : []);
    if (Array.isArray(items) && items.length > 0) {
      return items.slice(0, 8);
    }
  } catch (err) {
    console.warn('OpenAI smart plan fallback:', (err as Error).message);
  }

  return sorted.map((c) => buildRulePlanItem(c, focusSphere));
}

function buildRulePlanItem(c: ContactContext, focusSphere: Sphere | null): AiPlanItem {
  const scheduled = suggestScheduledTime(c.preferredTimes);
  const method = (['call', 'sms', 'email', 'meeting'].includes(c.preferredMethod)
    ? c.preferredMethod
    : 'call') as ContactMethod;

  let priority: 'high' | 'medium' | 'low' = 'low';
  if (c.healthStatus === 'at_risk' || (c.lastContactDaysAgo ?? 0) >= 21) priority = 'high';
  else if (c.healthStatus === 'cooling' || (c.lastContactDaysAgo ?? 0) >= 14) priority = 'medium';
  else if (focusSphere && c.sphere === focusSphere) priority = 'medium';

  let insight = ruleBasedInsight(c.name, c.lastContactDaysAgo, c.preferredTimes, c.healthStatus);
  if (focusSphere && c.sphere === focusSphere && priority !== 'high') {
    insight = `${SPHERE_LABELS[focusSphere]} time is behind this week — ${insight.charAt(0).toLowerCase()}${insight.slice(1)}`;
  }

  return {
    contactId: c.id,
    insight,
    scheduledTime: formatTime(scheduled),
    suggestedAction: method,
    priority,
  };
}

export async function generateMessage(
  contact: ContactContext,
  channel: ContactMethod,
  replyTo?: string,
): Promise<{ message: string; insight: string }> {
  const first = contact.name.split(' ')[0];
  const fallback = replyTo?.trim()
    ? {
        message:
          channel === 'email'
            ? `Hi ${first},\n\nThanks for your message. I'll follow up on that shortly.\n\nBest`
            : `Thanks ${first}! Got your message — I'll follow up shortly.`,
        insight: 'Reply based on their incoming message',
      }
    : {
        message: `Hey ${first}, free for a quick chat today?`,
        insight: contact.preferredTimes
          ? `Based on typical availability: ${contact.preferredTimes}`
          : 'Standard follow-up based on contact cadence',
      };

  if (!openai) return fallback;

  try {
    const replyNote = replyTo?.trim()
      ? `\nThey just sent you this message — write a direct reply:\n"${replyTo.trim()}"`
      : '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Write a brief, friendly ${channel} message to ${contact.name} at ${contact.company}. 
Last contact: ${contact.lastContactDaysAgo ?? 'unknown'} days ago. Preferred times: ${contact.preferredTimes ?? 'unknown'}.${replyNote}
Return JSON: { "message": "...", "insight": "one line why this timing" }`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { message?: string; insight?: string };
    if (parsed.message) {
      return {
        message: parsed.message,
        insight: parsed.insight ?? fallback.insight,
      };
    }
  } catch (err) {
    console.warn('OpenAI message fallback:', (err as Error).message);
  }

  return fallback;
}

export async function detectCommitmentsWithAi(
  text: string,
  opts: {
    contactName?: string;
    direction: 'mine' | 'theirs';
    messageDate: Date;
  },
): Promise<
  Array<{
    title: string;
    dueAt: string;
    direction: 'mine' | 'theirs';
    confidence: 'high' | 'medium' | 'low';
    sourceQuote: string;
  }>
> {
  const { ruleDetectCommitments } = await import('../lib/commitment-parser.js');
  const fallback = ruleDetectCommitments(text, opts.direction, opts.messageDate).map((r) => ({
    title: r.title,
    dueAt: r.dueAt.toISOString(),
    direction: r.direction,
    confidence: 'medium' as const,
    sourceQuote: r.sourceQuote,
  }));

  if (!openai) return fallback;

  try {
    const who =
      opts.direction === 'mine'
        ? 'You (the sender) wrote this outbound message'
        : `${opts.contactName ?? 'The contact'} sent this inbound message to you`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `${who}:
"${text}"

Message date: ${opts.messageDate.toISOString()}

Find commitments — promises to do something, or requests asking someone to act (e.g. "I'll get onto that tonight", "can you update this?", "send the quote by Friday").
Return JSON: { "commitments": [{ "title": "short action (max 80 chars)", "dueAt": "ISO8601 datetime", "direction": "mine"|"theirs", "confidence": "high"|"medium"|"low", "sourceQuote": "exact triggering phrase" }] }
Use direction "mine" if the writer promised to do something. Use "theirs" if they asked the reader to do something.
If none found, return { "commitments": [] }`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as {
      commitments?: Array<{
        title?: string;
        dueAt?: string;
        direction?: string;
        confidence?: string;
        sourceQuote?: string;
      }>;
    };

    const items = parsed.commitments ?? [];
    if (!Array.isArray(items) || items.length === 0) return fallback;

    return items
      .filter((c) => c.title && c.dueAt)
      .map((c) => ({
        title: String(c.title).slice(0, 120),
        dueAt: new Date(String(c.dueAt)).toISOString(),
        direction: (c.direction === 'theirs' ? 'theirs' : 'mine') as 'mine' | 'theirs',
        confidence: (['high', 'medium', 'low'].includes(String(c.confidence))
          ? c.confidence
          : 'medium') as 'high' | 'medium' | 'low',
        sourceQuote: String(c.sourceQuote ?? text.slice(0, 120)),
      }))
      .filter((c) => !Number.isNaN(new Date(c.dueAt).getTime()));
  } catch (err) {
    console.warn('OpenAI commitment detection fallback:', (err as Error).message);
    return fallback;
  }
}

export { actionLabel };
