function toLocalDateKey(date) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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

module.exports = { toLocalDateKey, lastNLocalDateKeys, filterHistoryToDateWindow, dateCoveragePercent };
