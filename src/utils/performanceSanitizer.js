function toFiniteNumber(value, fallback, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const bounded = Math.min(max, Math.max(min, parsed));
  return integer ? Math.round(bounded) : bounded;
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function sanitizeHistoryEntries(history) {
  if (!Array.isArray(history)) return [];
  const normalized = [];
  for (const entry of history) {
    if (!entry || typeof entry !== "object" || !isValidDateKey(entry.date)) continue;
    const scores = ["academic", "fitness", "hustle", "career"].map((key) =>
      toFiniteNumber(entry[key], NaN, { min: 0, max: 100 }),
    );
    if (scores.some((value) => !Number.isFinite(value))) continue;
    normalized.push({
      ...entry,
      academic: scores[0],
      fitness: scores[1],
      hustle: scores[2],
      career: scores[3],
    });
  }
  return normalized;
}

module.exports = { toFiniteNumber, sanitizeHistoryEntries, isValidDateKey };
