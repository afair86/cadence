import type { Contact, ContactMethod } from '@cadence/shared';

export function activityTypeForAction(action: ContactMethod): 'call' | 'sms' | 'email' | 'meeting' {
  if (action === 'sms') return 'sms';
  if (action === 'email') return 'email';
  if (action === 'meeting') return 'meeting';
  return 'call';
}

export function actionLabel(action: ContactMethod): string {
  if (action === 'call') return 'Call';
  if (action === 'sms') return 'Text';
  if (action === 'email') return 'Email';
  return 'Meeting';
}

export function channelValue(contact: Contact, action: ContactMethod): string | null {
  if (action === 'email') return contact.email ?? null;
  return contact.phone ?? null;
}

export function channelHref(contact: Contact, action: ContactMethod): string | null {
  const value = channelValue(contact, action);
  if (!value) return null;
  const clean = value.replace(/\s/g, '');
  if (action === 'email') return `mailto:${value}`;
  if (action === 'sms') return `sms:${clean}`;
  if (action === 'call') return `tel:${clean}`;
  return null;
}

export function tryOpenChannel(href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function missingContactField(action: ContactMethod): string {
  if (action === 'email') return 'email address';
  return 'phone number';
}

interface DeviceContact {
  name?: string[];
  email?: string[];
  tel?: string[];
}

export async function pickDeviceContacts(): Promise<
  { name: string; phone?: string; email?: string; company?: string }[]
> {
  const nav = navigator as Navigator & {
    contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<DeviceContact[]> };
  };

  if (!nav.contacts?.select) {
    throw new Error(
      'Contact import from your device is not supported in this browser. Upload a .vcf file or add manually.',
    );
  }

  const picked = await nav.contacts.select(['name', 'email', 'tel'], { multiple: true });
  return picked.map((c) => ({
    name: c.name?.[0] ?? 'Unknown',
    phone: c.tel?.[0],
    email: c.email?.[0],
    company: '',
  }));
}

export function parseVCard(text: string): { name: string; phone?: string; email?: string; company?: string }[] {
  const cards = text.split(/END:VCARD/i);
  const results: { name: string; phone?: string; email?: string; company?: string }[] = [];

  for (const block of cards) {
    if (!block.includes('BEGIN:VCARD')) continue;
    const fn = block.match(/^FN[^:]*:(.+)$/im)?.[1]?.trim();
    const n = block.match(/^N[^:]*:([^;\n]+)/im)?.[1]?.trim()?.replace(';', ' ');
    const name = fn || n;
    if (!name) continue;

    const phone =
      block.match(/^TEL[^:]*:(.+)$/im)?.[1]?.trim() ||
      block.match(/^item\d+\.TEL[^:]*:(.+)$/im)?.[1]?.trim();
    const email = block.match(/^EMAIL[^:]*:(.+)$/im)?.[1]?.trim();
    const company = block.match(/^ORG[^:]*:(.+)$/im)?.[1]?.trim()?.replace(/;/g, ' ');

    results.push({ name, phone, email, company });
  }

  return results;
}

export function parseContactsCsv(text: string): { name: string; phone?: string; email?: string; company?: string }[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (key: string) => headers.indexOf(key);

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      name: cols[idx('name')] || cols[0] || 'Unknown',
      company: cols[idx('company')] || cols[idx('organisation')] || undefined,
      phone: cols[idx('phone')] || cols[idx('tel')] || cols[idx('mobile')] || undefined,
      email: cols[idx('email')] || undefined,
    };
  });
}
