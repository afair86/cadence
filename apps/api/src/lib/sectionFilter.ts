import type { SectionView } from '@cadence/shared';
import { spheresForSection } from '@cadence/shared';
import { prisma } from '../db.js';

export async function contactIdsForSection(teamId: string, section: SectionView): Promise<string[] | null> {
  if (section === 'all') return null;
  const spheres = spheresForSection(section);
  const rows = await prisma.contact.findMany({
    where: { teamId, sphere: { in: spheres } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export function activityFilter(userId: string, teamId: string, contactIds: string[] | null) {
  return {
    userId,
    contact: contactIds
      ? { teamId, id: { in: contactIds } }
      : { teamId },
  };
}
