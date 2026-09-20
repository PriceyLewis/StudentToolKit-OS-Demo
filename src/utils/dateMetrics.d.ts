export type DateHistoryEntry = { date: string; [key: string]: unknown };
export function toLocalDateKey(date: Date | string | number): string;
export function parseLocalDateKey(value: string): Date | null;
export function daysUntilLocalDateKey(value: string, referenceDate?: Date): number | null;
export function lastNLocalDateKeys(days: number, referenceDate?: Date): string[];
export function filterHistoryToDateWindow<T extends DateHistoryEntry>(
  history: T[],
  days: number,
  referenceDate?: Date,
): T[];
export function dateCoveragePercent(
  history: DateHistoryEntry[],
  days: number,
  referenceDate?: Date,
): number;
