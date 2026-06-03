import type {
  Activity,
  AuthResponse,
  CalendarData,
  CalendarEvent,
  Commitment,
  CommitmentsData,
  Contact,
  CreateActivityInput,
  CreateCommitmentInput,
  CreateContactInput,
  DashboardData,
  LogInboundInput,
  MessagesData,
  ScanCommitmentInput,
  ScheduledMessage,
  RescheduleEventInput,
  ScheduleEventInput,
  SectionView,
  TimeBudgetSettings,
  User,
  WeeklyTimeBalance,
} from '@cadence/shared';

const base = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'cadence_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string,
  name: string,
  teamName?: string,
): Promise<AuthResponse> {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, teamName }),
  });
}

export async function fetchMe(): Promise<User> {
  return request('/api/auth/me');
}

export async function fetchDashboard(section: SectionView = 'business'): Promise<DashboardData> {
  return request(`/api/dashboard?section=${section}`);
}

export async function fetchContacts(section: SectionView = 'business'): Promise<Contact[]> {
  return request(`/api/contacts?section=${section}`);
}

export async function fetchContact(id: string): Promise<Contact> {
  return request(`/api/contacts/${id}`);
}

export async function createContact(data: CreateContactInput) {
  return request('/api/contacts', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchActivities(section: SectionView = 'business', limit = 50): Promise<Activity[]> {
  return request(`/api/activities?section=${section}&limit=${limit}`);
}

export async function createActivity(data: CreateActivityInput): Promise<Activity> {
  return request('/api/activities', { method: 'POST', body: JSON.stringify(data) });
}

export async function approveAutomation(id: string) {
  return request(`/api/messages/${id}/approve`, { method: 'POST' });
}

export async function fetchMessages(section: SectionView = 'business'): Promise<MessagesData> {
  return request(`/api/messages?section=${section}`);
}

export async function generateMessageDraft(
  contactId: string,
  channel?: string,
  replyTo?: string,
) {
  return request<ScheduledMessage>('/api/messages/generate', {
    method: 'POST',
    body: JSON.stringify({ contactId, channel, replyTo }),
  });
}

export async function updateMessage(id: string, message: string) {
  return request(`/api/messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ message }),
  });
}

export async function cancelMessage(id: string) {
  return request(`/api/messages/${id}`, { method: 'DELETE' });
}

export async function logInboundMessage(input: LogInboundInput) {
  return request<{ commitments?: unknown[] }>('/api/messages/inbound', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function markInboxMessageRead(id: string) {
  return request(`/api/messages/inbox/${id}/read`, { method: 'PATCH' });
}

export async function testCaptureWebhook() {
  return request('/api/messages/capture/test', { method: 'POST' });
}

export async function generateAutomation(contactId: string, channel?: string) {
  return generateMessageDraft(contactId, channel);
}

export async function fetchTimeBudget(): Promise<{
  settings: TimeBudgetSettings;
  balance: WeeklyTimeBalance;
}> {
  return request('/api/time-budget');
}

export async function updateTimeBudget(settings: Partial<TimeBudgetSettings>): Promise<{
  settings: TimeBudgetSettings;
  balance: WeeklyTimeBalance;
}> {
  return request('/api/time-budget', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function fetchCalendar(section: SectionView = 'business', week?: string): Promise<CalendarData> {
  const q = week ? `&week=${encodeURIComponent(week)}` : '';
  return request(`/api/calendar?section=${section}${q}`);
}

export async function scheduleCalendarEvent(input: ScheduleEventInput): Promise<CalendarEvent> {
  return request('/api/calendar/schedule', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function rescheduleCalendarEvent(input: RescheduleEventInput): Promise<CalendarEvent> {
  return request('/api/calendar/reschedule', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function planCalendarWeek(section: SectionView = 'business'): Promise<{ created: number }> {
  return request(`/api/calendar/plan-week?section=${section}`, { method: 'POST' });
}

export async function fetchCommitments(section: SectionView = 'business'): Promise<CommitmentsData> {
  return request(`/api/commitments?section=${section}`);
}

export async function createCommitment(input: CreateCommitmentInput): Promise<Commitment> {
  return request('/api/commitments', { method: 'POST', body: JSON.stringify(input) });
}

export async function scanCommitments(input: ScanCommitmentInput): Promise<{ created: number; commitments: Commitment[] }> {
  return request('/api/commitments/scan', { method: 'POST', body: JSON.stringify(input) });
}

export async function confirmCommitment(id: string): Promise<Commitment> {
  return request(`/api/commitments/${id}/confirm`, { method: 'PATCH' });
}

export async function completeCommitment(id: string): Promise<Commitment> {
  return request(`/api/commitments/${id}/done`, { method: 'PATCH' });
}

export async function dismissCommitment(id: string): Promise<Commitment> {
  return request(`/api/commitments/${id}/dismiss`, { method: 'PATCH' });
}
