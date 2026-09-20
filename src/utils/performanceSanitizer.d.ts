export function toFiniteNumber(
  value: unknown,
  fallback: number,
  options?: { min?: number; max?: number; integer?: boolean },
): number;

export type PerformanceHistoryEntry = {
  date: string;
  academic: number;
  fitness: number;
  hustle: number;
  career: number;
  [key: string]: unknown;
};

export function sanitizeHistoryEntries(history: unknown): PerformanceHistoryEntry[];
export function isValidDateKey(value: unknown): boolean;
