const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidDateKey, sanitizeHistoryEntries, toFiniteNumber } = require("../src/utils/performanceSanitizer.js");

test("toFiniteNumber rejects non-finite values and clamps ranges", () => {
  assert.equal(toFiniteNumber("NaN", 10, { min: 0, max: 100 }), 10);
  assert.equal(toFiniteNumber("Infinity", 10, { min: 0, max: 100 }), 10);
  assert.equal(toFiniteNumber(-5, 0, { min: 0, max: 100 }), 0);
  assert.equal(toFiniteNumber(150, 0, { min: 0, max: 100 }), 100);
  assert.equal(toFiniteNumber("4.6", 0, { min: 0, max: 7, integer: true }), 5);
});

test("isValidDateKey rejects calendar-normalised impossible dates", () => {
  assert.equal(isValidDateKey("2026-02-31"), false);
  assert.equal(isValidDateKey("2025-02-29"), false);
  assert.equal(isValidDateKey("2028-02-29"), true);
});

test("sanitizeHistoryEntries drops corrupt records and clamps valid scores", () => {
  const result = sanitizeHistoryEntries([
    { date: "2026-09-18", academic: 110, fitness: -5, hustle: 55, career: 80 },
    { date: "2026-02-31", academic: 50, fitness: 50, hustle: 50, career: 50 },
    { date: "2026-09-19", academic: "NaN", fitness: 50, hustle: 50, career: 50 },
    { date: "2026-09-20", academic: "75", fitness: 70, hustle: 65, career: 60 },
  ]);

  assert.deepEqual(result, [
    { date: "2026-09-18", academic: 100, fitness: 0, hustle: 55, career: 80 },
    { date: "2026-09-20", academic: 75, fitness: 70, hustle: 65, career: 60 },
  ]);
});
