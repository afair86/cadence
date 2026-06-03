import type { Sphere } from './sections.js';

export type CommitmentDirection = 'mine' | 'theirs';
export type CommitmentStatus = 'suggested' | 'open' | 'done' | 'dismissed';
export type CommitmentSource = 'inbox' | 'outbound' | 'activity' | 'manual';

export interface Commitment {
  id: string;
  contactId: string | null;
  contactName: string;
  company: string;
  sphere: Sphere | null;
  title: string;
  description?: string;
  dueAt: string;
  dueLabel: string;
  status: CommitmentStatus;
  direction: CommitmentDirection;
  source: CommitmentSource;
  sourceQuote?: string;
  overdue: boolean;
  createdAt: string;
}

export interface DetectedCommitment {
  title: string;
  dueAt: string;
  direction: CommitmentDirection;
  confidence: 'high' | 'medium' | 'low';
  sourceQuote: string;
}

export interface CommitmentsData {
  suggested: Commitment[];
  open: Commitment[];
  done: Commitment[];
  overdueCount: number;
  aiEnabled: boolean;
}

export interface CreateCommitmentInput {
  contactId?: string;
  title: string;
  description?: string;
  dueAt: string;
  direction?: CommitmentDirection;
}

export interface ScanCommitmentInput {
  text: string;
  contactId?: string;
  direction?: CommitmentDirection;
  source?: CommitmentSource;
  sourceId?: string;
}
