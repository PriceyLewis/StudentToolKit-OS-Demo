import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRevisionPlan,
  daysUntilDate,
  parseLocalDate,
  parseSubjects,
} from "../src/utils/revisionPlanner.js";

test("parseSubjects trims duplicates and empty values", () => {
  assert.deepEqual(parseSubjects("Algorithms, Databases, Algorithms, , Cloud"), [
    "Algorithms",
    "Databases",
    "Cloud",
  ]);
});

test("parseLocalDate rejects impossible calendar dates", () => {
  assert.equal(parseLocalDate("2026-02-30"), null);
  assert.ok(parseLocalDate("2026-09-30") instanceof Date);
});

test("daysUntilDate uses date boundaries rather than UTC string parsing", () => {
  const reference = new Date(2026, 8, 19, 22, 30);
  assert.equal(daysUntilDate("2026-09-20", reference), 1);
});

test("low-confidence subjects receive more revision time", () => {
  const plan = buildRevisionPlan({
    subjects: ["Algorithms", "Databases"],
    weeklyHours: 10,
    examDate: "2026-10-20",
    availabilityDays: 5,
    confidenceBySubject: {
      Algorithms: "low",
      Databases: "high",
    },
    referenceDate: new Date(2026, 8, 19),
  });

  assert.equal(plan.valid, true);
  const algorithms = plan.allocations.find((item) => item.subject === "Algorithms");
  const databases = plan.allocations.find((item) => item.subject === "Databases");
  assert.ok(algorithms.hours > databases.hours);
});

test("invalid or past exam dates do not generate a plan", () => {
  const plan = buildRevisionPlan({
    subjects: ["Algorithms"],
    weeklyHours: 10,
    examDate: "2026-09-01",
    referenceDate: new Date(2026, 8, 19),
  });

  assert.equal(plan.valid, false);
  assert.equal(plan.weeksRemaining, 0);
});
