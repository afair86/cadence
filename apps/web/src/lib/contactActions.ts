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

export function isIosDevice(): boolean {
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Chrome on Android is the main browser where the Contact Picker reliably opens. */
export function isContactPickerLikelySupported(): boolean {
  if (!window.isSecureContext) return false;
  if (isIosDevice()) return false;
  const nav = navigator as Navigator & { contacts?: { select?: unknown } };
  return Boolean(nav.contacts && typeof nav.contacts.select === 'function');
}

export function getDeviceContactImportMode(): 'picker' | 'vcf' {
  return isContactPickerLikelySupported() ? 'picker' : 'vcf';
}

function friendlyContactPickerError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('unable to open contact selector') || lower.includes('contact selector')) {
    return 'Your browser cannot open the contact picker. Use “Import from phone (.vcf)” below — it works on iPhone and most Android phones.';
  }
  if (lower.includes('secure') || lower.includes('https')) {
    return 'Contact picker requires a secure (HTTPS) connection. Upload a .vcf file instead.';
  }
  if (lower.includes('gesture') || lower.includes('user activation')) {
    return 'Tap the button again to choose contacts.';
  }
  return message || 'Could not open contacts. Upload a .vcf export from your phone instead.';
}

export async function pickDeviceContacts(): Promise<
  { name: string; phone?: string; email?: string; company?: string }[]
> {
  if (!isContactPickerLikelySupported()) {
    throw new Error('VCFFALLBACK');
  }

  const nav = navigator as Navigator & {
    contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<DeviceContact[]> };
  };

  try {
    const picked = await nav.contacts.select(['name', 'email', 'tel'], { multiple: true });
    if (!picked.length) return [];

    return picked.map((c) => ({
      name: c.name?.[0] ?? 'Unknown',
      phone: c.tel?.[0],
      email: c.email?.[0],
      company: '',
    }));
  } catch (err) {
    throw new Error(friendlyContactPickerError(err));
  }
}

export { parseVCard, parseContactsCsv, parseContactFile } from './contactImport';
