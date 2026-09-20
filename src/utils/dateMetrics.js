function toLocalDateKey(date) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function daysUntilLocalDateKey(value, referenceDate = new Date()) {
  const target = parseLocalDateKey(value);
  if (!target) {
    return null;
  }
  target.setHours(0, 0, 0, 0);
  const reference = new Date(referenceDate);
  reference.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - reference.getTime()) / 86400000);
}

function lastNLocalDateKeys(days, referenceDate = new Date()) {
  const count = Math.max(0, Math.round(Number(days) || 0));
  const reference = new Date(referenceDate);
  reference.setHours(0, 0, 0, 0);
  const keys = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(reference);
    date.setDate(reference.getDate() - index);
    keys.push(toLocalDateKey(date));
  }

  return keys;
}

function filterHistoryToDateWindow(history, days, referenceDate = new Date()) {
  const keys = new Set(lastNLocalDateKeys(days, referenceDate));

  return [...history]
    .filter((entry) => entry && typeof entry.date === "string" && keys.has(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function dateCoveragePercent(history, days, referenceDate = new Date()) {
  const count = Math.max(1, Math.round(Number(days) || 1));
  const keys = new Set(lastNLocalDateKeys(count, referenceDate));
  const covered = new Set(
    history
      .filter((entry) => entry && typeof entry.date === "string" && keys.has(entry.date))
      .map((entry) => entry.date),
  );

  return Math.round((covered.size / count) * 100);
}

module.exports = {
  toLocalDateKey,
  parseLocalDateKey,
  daysUntilLocalDateKey,
  lastNLocalDateKeys,
  filterHistoryToDateWindow,
  dateCoveragePercent,
};
