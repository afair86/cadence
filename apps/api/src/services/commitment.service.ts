import type {
  CommitmentDirection,
  CommitmentSource,
  CommitmentsData,
  CommitmentStatus,
  DetectedCommitment,
  SectionView,
  Sphere,
} from '@cadence/shared';
import { prisma } from '../db.js';
import { formatScheduled } from '../lib/helpers.js';
import { ruleDetectCommitments, parseDuePhrase } from '../lib/commitment-parser.js';
import { detectCommitmentsWithAi } from './ai.service.js';
import { contactIdsForSection } from '../lib/sectionFilter.js';

function dueLabel(dueAt: Date): string {
  return formatScheduled(dueAt);
}

function toDto(row: {
  id: string;
  contactId: string | null;
  title: string;
  description: string | null;
  dueAt: Date;
  status: string;
  direction: string;
  source: string;
  sourceQuote: string | null;
  createdAt: Date;
  contact: { name: string; company: string; sphere: string } | null;
}) {
  const now = new Date();
  return {
    id: row.id,
    contactId: row.contactId,
    contactName: row.contact?.name ?? 'Unknown',
    company: row.contact?.company ?? '—',
    sphere: (row.contact?.sphere as Sphere) ?? null,
    title: row.title,
    description: row.description ?? undefined,
    dueAt: row.dueAt.toISOString(),
    dueLabel: dueLabel(row.dueAt),
    status: row.status as CommitmentStatus,
    direction: row.direction as CommitmentDirection,
    source: row.source as CommitmentSource,
    sourceQuote: row.sourceQuote ?? undefined,
    overdue: row.status === 'open' && row.dueAt.getTime() < now.getTime(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function detectCommitments(
  text: string,
  opts: {
    contactName?: string;
    direction: CommitmentDirection;
    messageDate?: Date;
  },
): Promise<DetectedCommitment[]> {
  const baseDate = opts.messageDate ?? new Date();
  const trimmed = text.trim();
  if (trimmed.length < 8) return [];

  const aiResults = await detectCommitmentsWithAi(trimmed, {
    contactName: opts.contactName,
    direction: opts.direction,
    messageDate: baseDate,
  });

  if (aiResults.length > 0) return aiResults;

  return ruleDetectCommitments(trimmed, opts.direction, baseDate).map((r) => ({
    title: r.title,
    dueAt: r.dueAt.toISOString(),
    direction: r.direction,
    confidence: 'medium' as const,
    sourceQuote: r.sourceQuote,
  }));
}

export async function scanAndSaveCommitments(opts: {
  teamId: string;
  userId: string;
  contactId?: string | null;
  text: string;
  direction: CommitmentDirection;
  source: CommitmentSource;
  sourceId?: string;
  messageDate?: Date;
}) {
  const contact = opts.contactId
    ? await prisma.contact.findFirst({ where: { id: opts.contactId, teamId: opts.teamId } })
    : null;

  const detected = await detectCommitments(opts.text, {
    contactName: contact?.name,
    direction: opts.direction,
    messageDate: opts.messageDate,
  });

  if (detected.length === 0) return [];

  const saved = [];
  for (const item of detected) {
    if (opts.sourceId) {
      const existing = await prisma.commitment.findFirst({
        where: { teamId: opts.teamId, source: opts.source, sourceId: opts.sourceId },
      });
      if (existing) continue;
    }

    const dueAt = new Date(item.dueAt);
    if (Number.isNaN(dueAt.getTime())) continue;

    const status: CommitmentStatus =
      item.confidence === 'high' ? 'open' : 'suggested';

    const row = await prisma.commitment.create({
      data: {
        teamId: opts.teamId,
        userId: opts.userId,
        contactId: opts.contactId ?? undefined,
        title: item.title,
        dueAt,
        status,
        direction: item.direction,
        source: opts.source,
        sourceId: opts.sourceId,
        sourceQuote: item.sourceQuote,
      },
      include: { contact: true },
    });
    saved.push(toDto(row));
  }

  return saved;
}

export async function buildCommitmentsList(
  userId: string,
  teamId: string,
  section: SectionView,
): Promise<CommitmentsData> {
  const contactIds = await contactIdsForSection(teamId, section);
  const contactFilter = contactIds
    ? { teamId, contactId: { in: contactIds } }
    : { teamId };

  const rows = await prisma.commitment.findMany({
    where: {
      userId,
      ...contactFilter,
      status: { in: ['suggested', 'open', 'done'] },
    },
    include: { contact: true },
    orderBy: { dueAt: 'asc' },
    take: 100,
  });

  const dtos = rows.map(toDto);
  const now = new Date();

  return {
    suggested: dtos.filter((c) => c.status === 'suggested'),
    open: dtos.filter((c) => c.status === 'open'),
    done: dtos.filter((c) => c.status === 'done').slice(0, 20),
    overdueCount: dtos.filter(
      (c) => c.status === 'open' && new Date(c.dueAt).getTime() < now.getTime(),
    ).length,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
  };
}

export async function confirmCommitment(teamId: string, userId: string, id: string) {
  const row = await prisma.commitment.findFirst({
    where: { id, teamId, userId, status: 'suggested' },
    include: { contact: true },
  });
  if (!row) throw new Error('Commitment not found');
  const updated = await prisma.commitment.update({
    where: { id: row.id },
    data: { status: 'open' },
    include: { contact: true },
  });
  return toDto(updated);
}

export async function completeCommitment(teamId: string, userId: string, id: string) {
  const row = await prisma.commitment.findFirst({
    where: { id, teamId, userId, status: { in: ['suggested', 'open'] } },
    include: { contact: true },
  });
  if (!row) throw new Error('Commitment not found');
  const updated = await prisma.commitment.update({
    where: { id: row.id },
    data: { status: 'done' },
    include: { contact: true },
  });
  return toDto(updated);
}

export async function dismissCommitment(teamId: string, userId: string, id: string) {
  const row = await prisma.commitment.findFirst({
    where: { id, teamId, userId },
    include: { contact: true },
  });
  if (!row) throw new Error('Commitment not found');
  const updated = await prisma.commitment.update({
    where: { id: row.id },
    data: { status: 'dismissed' },
    include: { contact: true },
  });
  return toDto(updated);
}

export async function createManualCommitment(
  teamId: string,
  userId: string,
  input: {
    contactId?: string;
    title: string;
    description?: string;
    dueAt: string;
    direction?: CommitmentDirection;
  },
) {
  if (input.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: input.contactId, teamId },
    });
    if (!contact) throw new Error('Contact not found');
  }

  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new Error('Invalid due date');

  const row = await prisma.commitment.create({
    data: {
      teamId,
      userId,
      contactId: input.contactId,
      title: input.title.trim(),
      description: input.description?.trim(),
      dueAt,
      status: 'open',
      direction: input.direction ?? 'mine',
      source: 'manual',
    },
    include: { contact: true },
  });
  return toDto(row);
}

export async function updateCommitmentDue(
  teamId: string,
  userId: string,
  id: string,
  dueAt: string,
) {
  const when = new Date(dueAt);
  if (Number.isNaN(when.getTime())) throw new Error('Invalid due date');

  const row = await prisma.commitment.findFirst({
    where: { id, teamId, userId, status: { in: ['suggested', 'open'] } },
    include: { contact: true },
  });
  if (!row) throw new Error('Commitment not found');

  const updated = await prisma.commitment.update({
    where: { id: row.id },
    data: { dueAt: when },
    include: { contact: true },
  });
  return toDto(updated);
}

export { parseDuePhrase };
