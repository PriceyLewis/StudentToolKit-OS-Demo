export type HistoryEntry = {
  date: string; // YYYY-MM-DD
  academic: number;
  fitness: number;
  hustle: number;
  career: number;
};

type WeekAverages = {
  academic: number;
  fitness: number;
  hustle: number;
  career: number;
  overall: number;
};

const avg = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createEmptyEntry = (date: string): HistoryEntry => ({
  date,
  academic: 0,
  fitness: 0,
  hustle: 0,
  career: 0,
});

const buildDayRange = (
  entryByDate: Map<string, HistoryEntry>,
  startDate: Date,
  days: number
) => {
  const slice: HistoryEntry[] = [];

  for (let i = 0; i < days; i += 1) {
    const key = toDateKey(addDays(startDate, i));
    slice.push(entryByDate.get(key) ?? createEmptyEntry(key));
  }

  return slice;
};

export function getLast7DaySlices(
  history: HistoryEntry[],
  referenceDate?: string
) {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const latestDate =
    referenceDate ??
    (sorted.length > 0 ? sorted[sorted.length - 1].date : toDateKey(new Date()));

  const entryByDate = new Map(sorted.map((entry) => [entry.date, entry]));
  const endDate = new Date(`${latestDate}T00:00:00`);

  const last7Start = addDays(endDate, -6);
  const prev7Start = addDays(endDate, -13);

  const last7 = buildDayRange(entryByDate, last7Start, 7);
  const prev7 = buildDayRange(entryByDate, prev7Start, 7);

  return { last7, prev7 };
}

export function splitHistoryWeeks(history: HistoryEntry[]) {
  return getLast7DaySlices(history);
}

export function computeWeekAverages(week: HistoryEntry[]): WeekAverages {
  return {
    academic: avg(week.map((x) => x.academic)),
    fitness: avg(week.map((x) => x.fitness)),
    hustle: avg(week.map((x) => x.hustle)),
    career: avg(week.map((x) => x.career)),
    overall: avg(week.flatMap((x) => [x.academic, x.fitness, x.hustle, x.career])),
  };
}

export function delta(a: number, b: number) {
  return a - b;
}

export function generateInsights(lastAvg: WeekAverages, prevAvg: WeekAverages) {
  const insights: string[] = [];
  const categoryConfig: {
    key: keyof Omit<WeekAverages, "overall">;
    label: string;
  }[] = [
    { key: "academic", label: "Academic" },
    { key: "fitness", label: "Physical" },
    { key: "hustle", label: "Income" },
    { key: "career", label: "Professional" },
  ];

  const dOverall = delta(lastAvg.overall, prevAvg.overall);
  if (dOverall >= 3)
    insights.push("Strong week: your overall performance is trending up.");
  else if (dOverall <= -3)
    insights.push("Tough week: focus on one small win per day to regain momentum.");
  else
    insights.push("Stable week: small consistency improvements will move the needle.");

  const deltas = categoryConfig.map((x) => ({
    ...x,
    d: delta(lastAvg[x.key], prevAvg[x.key]),
  }));

  deltas.sort((a, b) => b.d - a.d);

  const best = deltas[0];
  const worst = deltas[deltas.length - 1];

  if (best?.d >= 2)
    insights.push(`${best.label} improved most this week. Keep that routine locked in.`);
  if (worst?.d <= -2)
    insights.push(
      `${worst.label} slipped this week. Reduce friction: schedule one easy action daily.`
    );

  const spread =
    Math.max(lastAvg.academic, lastAvg.fitness, lastAvg.hustle, lastAvg.career) -
    Math.min(lastAvg.academic, lastAvg.fitness, lastAvg.hustle, lastAvg.career);

  if (spread >= 20)
    insights.push(
      "Your scores are imbalanced. Bringing the lowest area up will raise your overall fastest."
    );

  return insights.slice(0, 4);
}
