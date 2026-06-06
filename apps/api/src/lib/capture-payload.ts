export interface CapturePayload {
  body?: string;
  text?: string;
  message?: string;
  notes?: string;
  platform?: string;
  type?: string;
  direction?: string;
  phone?: string;
  email?: string;
  from?: string;
  contactId?: string;
  externalId?: string;
  subject?: string;
  durationMin?: number;
  receivedAt?: string;
}
