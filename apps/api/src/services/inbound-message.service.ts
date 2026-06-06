import type { MessagePlatform } from '@cadence/shared';
import { prisma } from '../db.js';
import { formatScheduled } from '../lib/helpers.js';
import { refreshContactHealth } from '../services/points.service.js';

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function findContactByPhone(teamId: string, from: string) {
  const incoming = phoneDigits(from);
  if (incoming.length < 8) return null;

  const tail = incoming.slice(-9);
  const contacts = await prisma.contact.findMany({ where: { teamId } });

  return (
    contacts.find((c) => {
      const phones = [c.phone, c.whatsappPhone].filter(Boolean) as string[];
      return phones.some((p) => {
        const d = phoneDigits(p);
        return d.endsWith(tail) || tail.endsWith(d.slice(-9));
      });
    }) ?? null
  );
}

export async function findContactByEmail(teamId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  return prisma.contact.findFirst({
    where: { teamId, email: { equals: normalized, mode: 'insensitive' } },
  });
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

export async function recordInboundMessage(opts: {
  teamId: string;
  userId?: string;
  contactId?: string | null;
  platform: MessagePlatform;
  body: string;
  fromLabel?: string;
  externalId?: string;
  receivedAt?: Date;
}) {
  if (opts.externalId) {
    const existing = await prisma.inboxMessage.findUnique({
      where: { externalId: opts.externalId },
    });
    if (existing) return existing;
  }

  const row = await prisma.inboxMessage.create({
    data: {
      teamId: opts.teamId,
      userId: opts.userId,
      contactId: opts.contactId ?? undefined,
      platform: opts.platform,
      body: opts.body.trim(),
      fromLabel: opts.fromLabel,
      externalId: opts.externalId,
      receivedAt: opts.receivedAt ?? new Date(),
      status: 'unread',
    },
    include: { contact: true },
  });

  if (opts.contactId) {
    await prisma.contact.update({
      where: { id: opts.contactId },
      data: { lastContactAt: new Date() },
    });
    await refreshContactHealth(opts.contactId);
  }

  return row;
}

export function toInboundDto(row: {
  id: string;
  contactId: string | null;
  platform: string;
  body: string;
  fromLabel: string | null;
  status: string;
  receivedAt: Date;
  contact?: {
    name: string;
    company: string;
    sphere: string;
  } | null;
}) {
  return {
    id: row.id,
    contactId: row.contactId,
    contactName: row.contact?.name ?? row.fromLabel ?? 'Unknown',
    company: row.contact?.company ?? '—',
    sphere: (row.contact?.sphere as import('@cadence/shared').Sphere) ?? null,
    platform: row.platform as MessagePlatform,
    body: row.body,
    fromLabel: row.fromLabel ?? undefined,
    status: row.status as 'unread' | 'read',
    receivedAt: formatScheduled(row.receivedAt),
  };
}
