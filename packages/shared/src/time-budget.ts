import type { SectionView, Sphere } from './sections.js';

export interface TimeBudgetSettings {
  businessHoursPerWeek: number;
  personalHoursPerWeek: number;
  familyHoursPerWeek: number;
}

export interface WeeklyTimeRow {
  id: Sphere | 'total';
  label: string;
  targetHours: number;
  spentHours: number;
  remainingHours: number;
  progressPercent: number;
  accent: string;
  highlight?: boolean;
}

export interface WeeklyTimeBalance {
  weekLabel: string;
  rows: WeeklyTimeRow[];
  budget: TimeBudgetSettings;
  totalTargetHours: number;
  totalSpentHours: number;
  totalRemainingHours: number;
}

export const DEFAULT_TIME_BUDGET: TimeBudgetSettings = {
  businessHoursPerWeek: 20,
  personalHoursPerWeek: 3,
  familyHoursPerWeek: 2,
};

export const SPHERE_TIME_ACCENTS: Record<Sphere, string> = {
  business: '#6366f1',
  personal: '#0ea5e9',
  family: '#ec4899',
};

export function totalWeeklyHours(budget: TimeBudgetSettings): number {
  return budget.businessHoursPerWeek + budget.personalHoursPerWeek + budget.familyHoursPerWeek;
}
