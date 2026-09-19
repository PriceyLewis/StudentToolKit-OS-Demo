export type HabitLike = { id: string; active: boolean };
export type HabitCompletionLike = Record<string, Record<string, boolean>>;

export function getLocalDateKey(date: Date | string | number): string;
export function toggleHabitCompletion(
  completion: HabitCompletionLike,
  dateKey: string,
  habitId: string,
): HabitCompletionLike;
export function calculateHabitStreak(
  habits: HabitLike[],
  completion: HabitCompletionLike,
  fromDate?: Date,
): number;
