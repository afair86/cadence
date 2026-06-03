import type { Contact, ContactMethod, HealthStatus, Sphere } from '@cadence/shared';
import type { Contact as DbContact } from '@prisma/client';
import { daysSince } from '../lib/helpers.js';

export function toContactDto(row: DbContact): Contact {
  const days = daysSince(row.lastContactAt);
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    position: row.position ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    whatsappPhone: row.whatsappPhone ?? undefined,
    instagramHandle: row.instagramHandle ?? undefined,
    facebookUsername: row.facebookUsername ?? undefined,
    linkedinUrl: row.linkedinUrl ?? undefined,
    address: row.address ?? undefined,
    tags: row.tags,
    sphere: row.sphere as Contact['sphere'],
    healthScore: row.healthScore,
    healthStatus: row.healthStatus as HealthStatus,
    lastContactDaysAgo: days,
    preferredMethod: row.preferredMethod as ContactMethod,
    preferredTimes: row.preferredTimes ?? undefined,
    responseTime: row.responseTime ?? undefined,
  };
}
