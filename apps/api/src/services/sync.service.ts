import type { ActivityType } from '@cadence/shared';
import { prisma } from '../db.js';
import type { CapturePayload } from '../lib/capture-payload.js';
import { resolveContactForInbound, recordInboundMessage } from './inbound-message.service.js';
import { scanAndSaveCommitments } from './commitment.service.js';
import { pointsForActivity, refreshContactHealth } from './points.service.js';

export async function teamDefaultUserId(teamId: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { teamId },
    orderBy: { createdAt: 'asc' },
  });
  if (!user) throw new Error('No team member found');
  return user.id;
}

function activityNotes(raw: CapturePayload, fallback: string): string {
  const text = (raw.body ?? raw.text ?? raw.message ?? raw.notes ?? fallback).trim();
  if (raw.externalId) return `[sync:${raw.externalId}] ${text}`;
  return text || fallback;
}

async function findDuplicateActivity(contactId: string | null | undefined, externalId?: string) {
  if (!externalId || !contactId) return null;
  return prisma.activity.findFirst({
    where: {
      contactId,
      notes: { contains: `[sync:${externalId}]` },
    },
  });
}

export async function recordSyncedActivity(opts: {
  teamId: string;
  userId: string;
  contactId?: string | null;
  type: ActivityType;
  notes: string;
  durationMin?: number;
  externalId?: string;
  occurredAt?: Date;
}) {
  if (opts.externalId && opts.contactId) {
    const dup = await findDuplicateActivity(opts.contactId, opts.externalId);
    if (dup) return dup;
  }

  if (!opts.contactId) {
    return null;
  }

  const points = await pointsForActivity(opts.teamId, opts.type);
  const occurredAt = opts.occurredAt ?? new Date();

  const activity = await prisma.activity.create({
    data: {
      userId: opts.userId,
      contactId: opts.contactId,
      type: opts.type,
      durationMin: opts.durationMin,
      notes: opts.notes,
      points,
      occurredAt,
    },
    include: { contact: true },
  });

  await prisma.contact.update({
    where: { id: opts.contactId },
    data: { lastContactAt: occurredAt },
  });
  await refreshContactHealth(opts.contactId);

  return activity;
}

export async function processCallCapture(teamId: string, raw: CapturePayload) {
  const phoneHint = raw.phone ?? (raw.from && !raw.from.includes('@') ? raw.from : undefined);
  const contact = await resolveContactForInbound(teamId, {
    contactId: raw.contactId,
    phone: phoneHint,
    email: raw.email,
  });

  const userId = await teamDefaultUserId(teamId);
  const durationMin = raw.durationMin != null ? Number(raw.durationMin) : undefined;
  const notes = activityNotes(raw, durationMin ? `Phone call · ${durationMin} min` : 'Phone call');

  if (!contact) {
    return { activity: null, contactId: null, matched: false };
  }

  const activity = await recordSyncedActivity({
    teamId,
    userId,
    contactId: contact.id,
    type: 'call',
    notes,
    durationMin: Number.isFinite(durationMin) ? durationMin : undefined,
    externalId: raw.externalId,
    occurredAt: raw.receivedAt ? new Date(String(raw.receivedAt)) : undefined,
  });

  return { activity, contactId: contact.id, matched: true };
}

export async function processOutboundCapture(teamId: string, raw: CapturePayload, activityType: ActivityType) {
  const emailHint = raw.email ?? (raw.from?.includes('@') ? raw.from : undefined);
  const phoneHint = raw.phone ?? (raw.from && !raw.from.includes('@') ? raw.from : undefined);
  const contact = await resolveContactForInbound(teamId, {
    contactId: raw.contactId,
    phone: phoneHint,
    email: emailHint,
  });

  const userId = await teamDefaultUserId(teamId);
  const notes = activityNotes(raw, activityType === 'email' ? 'Sent email' : 'Sent text');

  if (!contact) {
    return { activity: null, contactId: null, matched: false };
  }

  const activity = await recordSyncedActivity({
    teamId,
    userId,
    contactId: contact.id,
    type: activityType,
    notes,
    externalId: raw.externalId,
    occurredAt: raw.receivedAt ? new Date(String(raw.receivedAt)) : undefined,
  });

  return { activity, contactId: contact.id, matched: true };
}

export async function processInboundCaptureWithCommitments(
  teamId: string,
  row: Awaited<ReturnType<typeof recordInboundMessage>>,
  body: string,
) {
  if (!row.contactId) return row;

  const userId = await teamDefaultUserId(teamId);
  await scanAndSaveCommitments({
    teamId,
    userId,
    contactId: row.contactId,
    text: body,
    direction: 'theirs',
    source: 'inbox',
    sourceId: row.id,
    messageDate: row.receivedAt,
  });

  return row;
}
