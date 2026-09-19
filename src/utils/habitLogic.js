function getLocalDateKey(date) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toggleHabitCompletion(completion, dateKey, habitId) {
  const snapshot = { ...(completion || {}) };
  const day = { ...(snapshot[dateKey] || {}) };
  day[habitId] = !day[habitId];
  snapshot[dateKey] = day;
  return snapshot;
}

function calculateHabitStreak(habits, completion, fromDate = new Date()) {
  const activeHabits = habits.filter((habit) => habit.active);
  if (activeHabits.length === 0) {
    return 0;
  }

  let streak = 0;
  const cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);

  for (let index = 0; index < 365; index += 1) {
    const key = getLocalDateKey(cursor);
    const day = completion[key] || {};
    const allDone = activeHabits.every((habit) => Boolean(day[habit.id]));

    if (!allDone) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

module.exports = { getLocalDateKey, toggleHabitCompletion, calculateHabitStreak };
