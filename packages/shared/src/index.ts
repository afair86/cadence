export type ContactMethod = 'call' | 'sms' | 'email' | 'meeting';
export type HealthStatus = 'healthy' | 'cooling' | 'at_risk';
import type { Sphere, SectionView } from './sections.js';
import type { WeeklyTimeBalance } from './time-budget.js';
import type { WeeklyTimeInsights, SmartPlanFocus } from './time-insights.js';
import type { MessagePlatform } from './platforms.js';
export type { Sphere, SectionView, SectionConfig } from './sections.js';
export { SECTIONS, SPHERE_LABELS, getSection, spheresForSection } from './sections.js';
export {
  DEFAULT_TIME_BUDGET,
  SPHERE_TIME_ACCENTS,
  totalWeeklyHours,
} from './time-budget.js';
export type { TimeBudgetSettings, WeeklyTimeBalance, WeeklyTimeRow } from './time-budget.js';
export type {
  TimePaceStatus,
  SectionTimeStatus,
  TimeNudge,
  WeeklyTimeSummary,
  SmartPlanFocus,
  WeeklyTimeInsights,
} from './time-insights.js';
export {
  buildWeeklyTimeInsights,
  smartPlanFocusFromInsights,
} from './time-insights.js';
export {
  MESSAGE_PLATFORMS,
  buildPlatformUrl,
  getAvailablePlatforms,
  platformLabel,
  phoneDigits,
  activityTypeForPlatform,
} from './platforms.js';
export type { MessagePlatform, PlatformOption } from './platforms.js';
export type {
  CalendarEvent,
  CalendarEventKind,
  CalendarData,
  CalendarSummary,
  ScheduleEventInput,
  RescheduleEventInput,
} from './calendar.js';
export { googleCalendarUrl, outlookCalendarUrl } from './calendar.js';
export type {
  Commitment,
  CommitmentDirection,
  CommitmentStatus,
  CommitmentSource,
  CommitmentsData,
  DetectedCommitment,
  CreateCommitmentInput,
  ScanCommitmentInput,
} from './commitments.js';
export type ActivityType =
  | 'call'
  | 'sms'
  | 'email'
  | 'meeting'
  | 'coffee'
  | 'site_visit'
  | 'quote'
  | 'note';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string;
  teamName?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  position?: string;
  phone?: string;
  email?: string;
  whatsappPhone?: string;
  instagramHandle?: string;
  facebookUsername?: string;
  linkedinUrl?: string;
  address?: string;
  tags: string[];
  sphere: Sphere;
  healthScore: number;
  healthStatus: HealthStatus;
  lastContactDaysAgo: number | null;
  preferredMethod: ContactMethod;
  preferredTimes?: string;
  responseTime?: string;
}

export interface CreateContactInput {
  name: string;
  company: string;
  position?: string;
  phone?: string;
  email?: string;
  whatsappPhone?: string;
  instagramHandle?: string;
  facebookUsername?: string;
  linkedinUrl?: string;
  address?: string;
  tags?: string[];
  sphere?: Sphere;
  preferredMethod?: ContactMethod;
  preferredTimes?: string;
  responseTime?: string;
}

export interface ImportContactsResult {
  imported: number;
  skipped: number;
}

export interface Activity {
  id: string;
  contactId: string;
  contactName: string;
  company: string;
  type: ActivityType;
  durationMin?: number;
  outcome?: string;
  notes?: string;
  points: number;
  occurredAt: string;
}

export interface CreateActivityInput {
  contactId: string;
  type: ActivityType;
  durationMin?: number;
  outcome?: string;
  notes?: string;
  occurredAt?: string;
}

export interface SmartPlanItem {
  id: string;
  contactId: string;
  contactName: string;
  company: string;
  priority: 'high' | 'medium' | 'low';
  insight: string;
  scheduledTime: string;
  suggestedAction: ContactMethod;
  actionLabel: string;
}

export interface KpiCard {
  id: string;
  label: string;
  value: number;
  delta: string;
  icon: 'phone' | 'mail' | 'meeting' | 'message' | 'points';
  accent: string;
  progress?: number;
}

export interface AutomationMessage {
  id: string;
  contactId: string;
  contactName: string;
  company: string;
  scheduledFor: string;
  message: string;
  statusLabel: string;
  channel: ContactMethod;
  insight?: string;
}

export interface ScheduledMessage {
  id: string;
  contactId: string;
  contactName: string;
  company: string;
  sphere: Sphere;
  scheduledFor: string;
  message: string;
  status: 'pending' | 'scheduled' | 'sent' | 'cancelled';
  channel: ContactMethod;
  insight?: string;
}

export interface SentMessage {
  id: string;
  contactId: string;
  contactName: string;
  company: string;
  sphere: Sphere;
  channel: ContactMethod;
  message: string;
  sentAt: string;
}

export interface InboundMessage {
  id: string;
  contactId: string | null;
  contactName: string;
  company: string;
  sphere: Sphere | null;
  platform: MessagePlatform;
  body: string;
  fromLabel?: string;
  status: 'unread' | 'read';
  receivedAt: string;
}

export interface LogInboundInput {
  contactId: string;
  platform: MessagePlatform;
  body: string;
  receivedAt?: string;
}

export interface CaptureSetup {
  webhookUrl: string;
  emailWebhookUrl: string;
  smsWebhookUrl: string;
  callWebhookUrl: string;
}

export type SyncChannel = 'message' | 'email' | 'call';

export interface MessagesData {
  inbound: InboundMessage[];
  unreadCount: number;
  upcoming: ScheduledMessage[];
  sent: SentMessage[];
  aiEnabled: boolean;
  captureEnabled: boolean;
  capture: CaptureSetup;
}

export interface RelationshipHealthBreakdown {
  healthy: number;
  cooling: number;
  atRisk: number;
}

export interface Opportunity {
  id: string;
  company: string;
  value: number;
  stage: string;
}

export interface DashboardData {
  greeting: string;
  userName: string;
  userRole: string;
  dateLabel: string;
  activeSection: SectionView;
  sectionLabel: string;
  sectionSubtitle: string;
  kpis: KpiCard[];
  smartPlan: SmartPlanItem[];
  estimatedMinutes: number;
  automation: AutomationMessage | null;
  relationshipHealth: RelationshipHealthBreakdown;
  opportunities: Opportunity[];
  monthlyPoints: { current: number; target: number; daysRemaining: number };
  notifications: { messages: number; alerts: number };
  weeklyTime: WeeklyTimeBalance;
  weeklyInsights: WeeklyTimeInsights;
  smartPlanFocus: SmartPlanFocus | null;
  aiEnabled: boolean;
}

export const DEFAULT_POINTS: Record<ActivityType, number> = {
  call: 1,
  sms: 0.5,
  email: 0.5,
  meeting: 2,
  coffee: 2,
  site_visit: 1.5,
  quote: 0.5,
  note: 0.25,
};

export const ACTION_LABELS: Record<ContactMethod, string> = {
  call: 'Call Now',
  sms: 'Send Text',
  email: 'Send Email',
  meeting: 'Schedule Meeting',
};
