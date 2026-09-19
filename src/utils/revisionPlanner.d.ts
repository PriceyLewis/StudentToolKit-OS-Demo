export type RevisionConfidence = "low" | "medium" | "high";
export type RevisionIntensity = "light" | "balanced" | "intensive";

export type RevisionAllocation = {
  subject: string;
  confidence: RevisionConfidence;
  hours: number;
  minutes: number;
  sessions: number;
};

export type RevisionPlan = {
  valid: boolean;
  daysRemaining: number | null;
  weeksRemaining: number;
  readinessScore: number;
  reviewBufferHours: number;
  focusHours: number;
  recommendedSessionMinutes: number;
  sessionsPerWeek: number;
  allocations: RevisionAllocation[];
};

export function parseSubjects(input: string): string[];
export function parseLocalDate(value: string): Date | null;
export function daysUntilDate(dateString: string, referenceDate?: Date): number | null;
export function buildRevisionPlan(input: {
  subjects: string[];
  weeklyHours: number | string;
  examDate: string;
  intensity?: RevisionIntensity;
  availabilityDays?: number | string;
  confidenceBySubject?: Record<string, RevisionConfidence>;
  referenceDate?: Date;
}): RevisionPlan;
