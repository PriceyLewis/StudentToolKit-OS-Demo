const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateHabitStreak, getLocalDateKey, toggleHabitCompletion } = require("../src/utils/habitLogic.js");

test("habit completion survives serialization like an app restart", () => {
  const today = "2026-09-19";
  const next = toggleHabitCompletion({}, today, "study");
  const afterRestart = JSON.parse(JSON.stringify(next));

  assert.equal(afterRestart[today].study, true);
});

test("habit toggle is immutable and can be toggled back off", () => {
  const today = "2026-09-19";
  const initial = { [today]: { study: true } };
  const next = toggleHabitCompletion(initial, today, "study");

  assert.notEqual(next, initial);
  assert.equal(initial[today].study, true);
  assert.equal(next[today].study, false);
});

test("streak counts consecutive fully completed days and stops at a gap", () => {
  const habits = [
    { id: "study", active: true },
    { id: "career", active: true },
  ];
  const reference = new Date(2026, 8, 19);
  const completion = {
    [getLocalDateKey(reference)]: { study: true, career: true },
    "2026-09-18": { study: true, career: true },
    "2026-09-17": { study: true, career: false },
    "2026-09-16": { study: true, career: true },
  };

  assert.equal(calculateHabitStreak(habits, completion, reference), 2);
});
