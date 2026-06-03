export type MessagePlatform =
  | 'sms'
  | 'whatsapp'
  | 'email'
  | 'instagram'
  | 'facebook'
  | 'linkedin';

export interface ContactPlatformFields {
  phone?: string;
  email?: string;
  whatsappPhone?: string;
  instagramHandle?: string;
  facebookUsername?: string;
  linkedinUrl?: string;
}

export interface PlatformOption {
  id: MessagePlatform;
  label: string;
  description: string;
  canPrefillMessage: boolean;
}

export const MESSAGE_PLATFORMS: PlatformOption[] = [
  {
    id: 'sms',
    label: 'Text / iMessage',
    description: 'SMS, iMessage, or Google Messages on your phone',
    canPrefillMessage: true,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Opens WhatsApp with your draft',
    canPrefillMessage: true,
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Gmail, Outlook, or your mail app',
    canPrefillMessage: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Opens Instagram DM — paste your draft',
    canPrefillMessage: false,
  },
  {
    id: 'facebook',
    label: 'Facebook Messenger',
    description: 'Opens Messenger — paste your draft',
    canPrefillMessage: false,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Opens LinkedIn messaging — paste your draft',
    canPrefillMessage: false,
  },
];

export function phoneDigits(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

export function getAvailablePlatforms(contact: ContactPlatformFields): MessagePlatform[] {
  const platforms: MessagePlatform[] = [];
  if (phoneDigits(contact.phone)) {
    platforms.push('sms', 'whatsapp');
  }
  if (contact.email) platforms.push('email');
  if (contact.instagramHandle) platforms.push('instagram');
  if (contact.facebookUsername) platforms.push('facebook');
  if (contact.linkedinUrl) platforms.push('linkedin');
  return platforms;
}

export function platformLabel(id: MessagePlatform): string {
  return MESSAGE_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

export function buildPlatformUrl(
  platform: MessagePlatform,
  contact: ContactPlatformFields,
  message?: string,
): string | null {
  const encoded = message ? encodeURIComponent(message) : '';

  switch (platform) {
    case 'sms': {
      const digits = phoneDigits(contact.phone);
      if (!digits) return null;
      return message ? `sms:${digits}?body=${encoded}` : `sms:${digits}`;
    }
    case 'whatsapp': {
      const digits = phoneDigits(contact.whatsappPhone ?? contact.phone);
      if (!digits) return null;
      return message ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/${digits}`;
    }
    case 'email': {
      if (!contact.email) return null;
      return message ? `mailto:${contact.email}?body=${encoded}` : `mailto:${contact.email}`;
    }
    case 'instagram': {
      const handle = contact.instagramHandle?.replace(/^@/, '').trim();
      if (!handle) return null;
      return `https://ig.me/m/${handle}`;
    }
    case 'facebook': {
      const user = contact.facebookUsername?.replace(/^@/, '').trim();
      if (!user) return null;
      return `https://m.me/${user}`;
    }
    case 'linkedin': {
      if (!contact.linkedinUrl?.trim()) return null;
      const url = contact.linkedinUrl.trim();
      if (url.startsWith('http')) return url;
      return `https://www.linkedin.com/in/${url.replace(/^\/+/, '')}`;
    }
    default:
      return null;
  }
}

export function activityTypeForPlatform(platform: MessagePlatform): 'sms' | 'email' | 'note' {
  if (platform === 'email') return 'email';
  if (platform === 'sms' || platform === 'whatsapp') return 'sms';
  return 'note';
}
