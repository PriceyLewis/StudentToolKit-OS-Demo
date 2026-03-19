import type { Habit, HabitCategory, HabitCompletion, HabitDifficulty } from "../../context/HabitContext";

const iso = (d: Date) => d.toISOString().split("T")[0];
const DIFFICULTY_WEIGHT: Record<HabitDifficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

export function lastNDates(n: number) {
  const dates: string[] = [];
  const d = new Date();

  for (let i = 0; i < n; i += 1) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    dates.push(iso(x));
  }

  return dates.reverse();
}

export function weeklyHabitStats(habits: Habit[], completion: HabitCompletion, days = 7) {
  const active = habits.filter((habit) => habit.active);
  const dates = lastNDates(days);

  let done = 0;
  let weightedDone = 0;
  let weightedTotal = 0;

  const byCat: Record<HabitCategory, { done: number; total: number; weightedDone: number; weightedTotal: number }> = {
    academic: { done: 0, total: 0, weightedDone: 0, weightedTotal: 0 },
    fitness: { done: 0, total: 0, weightedDone: 0, weightedTotal: 0 },
    hustle: { done: 0, total: 0, weightedDone: 0, weightedTotal: 0 },
    career: { done: 0, total: 0, weightedDone: 0, weightedTotal: 0 },
  };

  for (const date of dates) {
    const day = completion?.[date] || {};

      for (const habit of active) {
        const checked = !!day[habit.id];
        const weight = DIFFICULTY_WEIGHT[habit.difficulty ?? "medium"];
        if (checked) {
          done += 1;
          weightedDone += weight;
        }
        weightedTotal += weight;
        byCat[habit.category].total += 1;
        byCat[habit.category].weightedTotal += weight;
        if (checked) {
          byCat[habit.category].done += 1;
          byCat[habit.category].weightedDone += weight;
        }
      }
  }

  const pct = weightedTotal ? Math.round((weightedDone / weightedTotal) * 100) : 0;

  const pctByCat = Object.fromEntries(
    Object.entries(byCat).map(([key, value]) => [
      key,
      value.weightedTotal ? Math.round((value.weightedDone / value.weightedTotal) * 100) : 0,
    ])
  ) as Record<HabitCategory, number>;

  const rawPct = active.length * dates.length ? Math.round((done / (active.length * dates.length)) * 100) : 0;
  return { pct, rawPct, pctByCat, dates };
}
