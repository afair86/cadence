import type { MessagePlatform } from '@cadence/shared';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import {
  findContactByEmail,
  findContactByPhone,
  recordInboundMessage,
} from './inbound-message.service.js';

const PLATFORMS = new Set<MessagePlatform>([
  'sms',
  'whatsapp',
  'email',
  'instagram',
  'facebook',
  'linkedin',
]);

export function publicApiBase(req: Request): string {
  const env = process.env.PUBLIC_API_URL?.replace(/\/$/, '');
  if (env) return env;
  const host = req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  return `${proto}://${host}`;
}

export async function getTeamByCaptureToken(token: string) {
  return prisma.team.findUnique({ where: { captureToken: token } });
}

export async function ensureCaptureToken(teamId: string): Promise<string> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { captureToken: true },
  });
  if (!team) throw new Error('Team not found');
  if (team.captureToken) return team.captureToken;

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { captureToken: randomUUID() },
    select: { captureToken: true },
  });
  return updated.captureToken!;
}

export async function buildCaptureSetup(teamId: string, baseUrl: string) {
  const token = await ensureCaptureToken(teamId);
  const root = `${baseUrl}/api/webhooks/capture/${token}`;
  return {
    webhookUrl: root,
    emailWebhookUrl: `${root}/email`,
    smsWebhookUrl: `${root}/sms`,
  };
}

function normalizePlatform(raw?: string, hasEmail?: boolean): MessagePlatform {
  const p = raw?.trim().toLowerCase();
  if (p && PLATFORMS.has(p as MessagePlatform)) return p as MessagePlatform;
  if (hasEmail) return 'email';
  return 'sms';
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/) ?? raw.match(/([\w.+-]+@[\w.-]+\.\w+)/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}

export async function resolveContactForInbound(
  teamId: string,
  opts: { contactId?: string; phone?: string; email?: string },
) {
  if (opts.contactId) {
    const byId = await prisma.contact.findFirst({
      where: { id: opts.contactId, teamId },
    });
    if (byId) return byId;
  }

  if (opts.email) {
    const byEmail = await findContactByEmail(teamId, extractEmailAddress(opts.email));
    if (byEmail) return byEmail;
  }

  if (opts.phone) {
    const byPhone = await findContactByPhone(teamId, opts.phone);
    if (byPhone) return byPhone;
  }

  return null;
}

export interface CapturePayload {
  body?: string;
  text?: string;
  message?: string;
  platform?: string;
  phone?: string;
  email?: string;
  from?: string;
  contactId?: string;
  externalId?: string;
  subject?: string;
}

export async function processCapturePayload(teamId: string, raw: CapturePayload) {
  const subject = raw.subject?.trim();
  const body = (raw.body ?? raw.text ?? raw.message ?? '').trim();
  const fullBody = subject && body ? `${subject}\n\n${body}` : body || subject || '';

  if (!fullBody) {
    throw new Error('Message body required');
  }

  const emailHint = raw.email ?? (raw.from?.includes('@') ? raw.from : undefined);
  const phoneHint = raw.phone ?? (raw.from && !raw.from.includes('@') ? raw.from : undefined);
  const platform = normalizePlatform(raw.platform, Boolean(emailHint));

  const contact = await resolveContactForInbound(teamId, {
    contactId: raw.contactId,
    phone: phoneHint,
    email: emailHint,
  });

  const fromLabel =
    raw.from?.trim() ||
    raw.phone?.trim() ||
    (emailHint ? extractEmailAddress(emailHint) : undefined);

  return recordInboundMessage({
    teamId,
    contactId: contact?.id ?? null,
    platform,
    body: fullBody,
    fromLabel,
    externalId: raw.externalId,
  });
}

/** Mailgun, SendGrid, or plain JSON email inbound */
export function parseEmailWebhook(body: Record<string, unknown>): CapturePayload {
  const sender =
    String(body.sender ?? body.from ?? body.envelope ?? '').trim() ||
    String((body.headers as string | undefined) ?? '').match(/From: (.+)/i)?.[1]?.trim();

  const text =
    String(body['body-plain'] ?? body['stripped-text'] ?? body.text ?? body.body ?? '').trim() ||
    String(body.html ?? '').replace(/<[^>]+>/g, ' ').trim();

  const subject = String(body.subject ?? '').trim();
  const messageId =
    String(body['Message-Id'] ?? body.message_id ?? body.messageId ?? '').trim() || undefined;

  return {
    from: sender,
    email: sender,
    subject,
    body: text,
    platform: 'email',
    externalId: messageId,
  };
}

export async function processSmsWebhook(
  teamId: string,
  from: string,
  body: string,
  externalId?: string,
) {
  return processCapturePayload(teamId, {
    from,
    phone: from,
    body,
    platform: 'sms',
    externalId,
  });
}
