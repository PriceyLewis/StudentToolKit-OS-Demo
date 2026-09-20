const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dateCoveragePercent,
  daysUntilLocalDateKey,
  filterHistoryToDateWindow,
  lastNLocalDateKeys,
  parseLocalDateKey,
} = require("../src/utils/dateMetrics.js");

test("lastNLocalDateKeys returns exact local calendar days", () => {
  const reference = new Date(2026, 8, 19, 23, 30);
  assert.deepEqual(lastNLocalDateKeys(3, reference), [
    "2026-09-17",
    "2026-09-18",
    "2026-09-19",
  ]);
});

test("filterHistoryToDateWindow excludes stale records even when they are recent array entries", () => {
  const history = [
    { date: "2026-08-01", academic: 99 },
    { date: "2026-09-18", academic: 70 },
    { date: "2026-09-19", academic: 72 },
  ];
  const result = filterHistoryToDateWindow(history, 2, new Date(2026, 8, 19));
  assert.deepEqual(result.map((item) => item.date), ["2026-09-18", "2026-09-19"]);
});

test("dateCoveragePercent counts unique calendar dates rather than raw records", () => {
  const history = [
    { date: "2026-09-18" },
    { date: "2026-09-18" },
    { date: "2026-09-19" },
  ];
  assert.equal(dateCoveragePercent(history, 4, new Date(2026, 8, 19)), 50);
});


test("parseLocalDateKey rejects impossible dates instead of normalising them", () => {
  assert.equal(parseLocalDateKey("2026-02-31"), null);
  assert.equal(parseLocalDateKey("2025-02-29"), null);
  assert.ok(parseLocalDateKey("2028-02-29") instanceof Date);
});

test("daysUntilLocalDateKey uses local calendar boundaries and rejects corrupt values", () => {
  const reference = new Date(2026, 8, 20, 23, 55);
  assert.equal(daysUntilLocalDateKey("2026-09-20", reference), 0);
  assert.equal(daysUntilLocalDateKey("2026-09-21", reference), 1);
  assert.equal(daysUntilLocalDateKey("2026-02-31", reference), null);
});
