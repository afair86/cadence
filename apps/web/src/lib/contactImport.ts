export interface ParsedContactRow {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
}

const HEADER_MAP: Record<string, keyof ParsedContactRow | 'firstName' | 'lastName'> = {
  name: 'name',
  'full name': 'name',
  'display name': 'name',
  'contact name': 'name',
  'first name': 'firstName',
  'given name': 'firstName',
  first: 'firstName',
  'last name': 'lastName',
  'family name': 'lastName',
  last: 'lastName',
  surname: 'lastName',
  company: 'company',
  organization: 'company',
  organisation: 'company',
  org: 'company',
  'company name': 'company',
  phone: 'phone',
  mobile: 'phone',
  'mobile phone': 'phone',
  tel: 'phone',
  telephone: 'phone',
  'phone 1 - value': 'phone',
  'primary phone': 'phone',
  email: 'email',
  'e-mail': 'email',
  'email address': 'email',
  'e-mail 1 - value': 'email',
  'primary email': 'email',
};

function parseCsvRow(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function cleanPhone(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function cleanEmail(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : undefined;
}

function buildName(row: Record<string, string>): string | undefined {
  if (row.name) return row.name.trim();
  const parts = [row.firstName, row.lastName].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(' ').trim();
}

export function parseContactsCsv(text: string): ParsedContactRow[] {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map(normalizeHeader);
  const fieldIndexes: Partial<Record<keyof ParsedContactRow | 'firstName' | 'lastName', number>> = {};

  headers.forEach((header, index) => {
    const field = HEADER_MAP[header];
    if (field) fieldIndexes[field] = index;
  });

  const results: ParsedContactRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvRow(line);
    if (cols.every((col) => !col.trim())) continue;

    const raw: Record<string, string> = {};
    for (const [field, index] of Object.entries(fieldIndexes)) {
      if (index === undefined) continue;
      raw[field] = cols[index]?.trim() ?? '';
    }

    const name = buildName(raw) ?? cols[0]?.trim();
    if (!name) continue;

    results.push({
      name,
      company: raw.company?.trim() || undefined,
      phone: cleanPhone(raw.phone),
      email: cleanEmail(raw.email),
    });
  }

  return results;
}

export function parseVCard(text: string): ParsedContactRow[] {
  const cards = text.split(/END:VCARD/i);
  const results: ParsedContactRow[] = [];

  for (const block of cards) {
    if (!block.includes('BEGIN:VCARD')) continue;

    const fn = block.match(/^FN[^:]*:(.+)$/im)?.[1]?.trim();
    const n = block.match(/^N[^:]*:([^;\n]+)/im)?.[1]?.trim()?.replace(/;/g, ' ').trim();
    const name = fn || n;
    if (!name) continue;

    const phone =
      block.match(/^TEL[^:]*:(.+)$/im)?.[1]?.trim() ||
      block.match(/^item\d+\.TEL[^:]*:(.+)$/im)?.[1]?.trim();
    const email = block.match(/^EMAIL[^:]*:(.+)$/im)?.[1]?.trim();
    const company = block.match(/^ORG[^:]*:(.+)$/im)?.[1]?.trim()?.replace(/;/g, ' ');

    results.push({
      name,
      phone: cleanPhone(phone),
      email: cleanEmail(email),
      company: company || undefined,
    });
  }

  return results;
}

export function parseContactFile(file: File, text: string): ParsedContactRow[] {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) return parseContactsCsv(text);
  if (lower.endsWith('.vcf') || lower.endsWith('.vcard')) return parseVCard(text);
  if (text.includes('BEGIN:VCARD')) return parseVCard(text);
  return parseContactsCsv(text);
}

export const CONTACT_IMPORT_TEMPLATE = `Name,Company,Phone,Email
Jane Smith,Acme Inc,+1 555 0100,jane@acme.com
Alex Thomas,Demo Sales Team,+1 555 0101,alex@demo.com`;

export function downloadContactTemplate() {
  const blob = new Blob([CONTACT_IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cadence-contacts-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}
