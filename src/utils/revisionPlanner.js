const CONFIDENCE_WEIGHTS = {
  low: 1.45,
  medium: 1,
  high: 0.75,
};

const INTENSITY_MULTIPLIERS = {
  light: 0.85,
  balanced: 1,
  intensive: 1.15,
};

function parseSubjects(input) {
  return String(input || "")
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean)
    .filter((subject, index, all) => all.indexOf(subject) === index);
}

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function daysUntilDate(dateString, referenceDate = new Date()) {
  const target = parseLocalDate(dateString);
  if (!target) return null;

  const reference = new Date(referenceDate);
  reference.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - reference.getTime()) / 86400000);
}

function buildRevisionPlan({
  subjects,
  weeklyHours,
  examDate,
  intensity = "balanced",
  availabilityDays = 5,
  confidenceBySubject = {},
  referenceDate = new Date(),
}) {
  const cleanSubjects = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
  const hours = Math.max(0, Number(weeklyHours) || 0);
  const availableDays = Math.max(1, Math.min(7, Math.round(Number(availabilityDays) || 1)));
  const daysRemaining = daysUntilDate(examDate, referenceDate);
  const weeksRemaining =
    daysRemaining === null || daysRemaining <= 0 ? 0 : Math.ceil(daysRemaining / 7);

  if (!cleanSubjects.length || !hours || !weeksRemaining) {
    return {
      valid: false,
      daysRemaining,
      weeksRemaining,
      readinessScore: 0,
      reviewBufferHours: 0,
      focusHours: 0,
      recommendedSessionMinutes: 0,
      sessionsPerWeek: 0,
      allocations: [],
    };
  }

  const reviewBufferHours = hours * 0.15;
  const baseFocusHours = Math.max(0, hours - reviewBufferHours);
  const intensityMultiplier = INTENSITY_MULTIPLIERS[intensity] ?? 1;
  const urgencyMultiplier =
    daysRemaining <= 14 ? 1.12 : daysRemaining <= 30 ? 1.06 : 1;
  const focusHours = baseFocusHours * intensityMultiplier * urgencyMultiplier;

  const weightedSubjects = cleanSubjects.map((subject) => {
    const confidence = confidenceBySubject[subject] || "medium";
    return {
      subject,
      confidence,
      weight: CONFIDENCE_WEIGHTS[confidence] || CONFIDENCE_WEIGHTS.medium,
    };
  });
  const totalWeight = weightedSubjects.reduce((sum, item) => sum + item.weight, 0);

  const allocations = weightedSubjects.map((item) => {
    const hoursForSubject = totalWeight ? (focusHours * item.weight) / totalWeight : 0;
    const minutes = Math.round(hoursForSubject * 60);
    return {
      subject: item.subject,
      confidence: item.confidence,
      hours: Number(hoursForSubject.toFixed(1)),
      minutes,
      sessions: Math.max(1, Math.ceil(minutes / 50)),
    };
  });

  const totalFocusMinutes = Math.round(focusHours * 60);
  const sessionsPerWeek = Math.max(1, Math.ceil(totalFocusMinutes / 50));
  const averageSessionMinutes = totalFocusMinutes / sessionsPerWeek;
  const recommendedSessionMinutes = Math.max(
    25,
    Math.min(60, Math.round(averageSessionMinutes / 5) * 5),
  );

  const runwayScore =
    daysRemaining >= 42 ? 35 : daysRemaining >= 28 ? 30 : daysRemaining >= 14 ? 22 : 14;
  const scheduleScore =
    hours >= 12 && availableDays >= 5
      ? 30
      : hours >= 8 && availableDays >= 4
        ? 24
        : hours >= 5 && availableDays >= 3
          ? 18
          : 10;

  const confidenceValues = weightedSubjects.map((item) =>
    item.confidence === "high" ? 1 : item.confidence === "medium" ? 0.7 : 0.4,
  );
  const confidenceAverage =
    confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;
  const confidenceScore = Math.round(confidenceAverage * 35);
  const readinessScore = Math.max(0, Math.min(100, runwayScore + scheduleScore + confidenceScore));

  return {
    valid: true,
    daysRemaining,
    weeksRemaining,
    readinessScore,
    reviewBufferHours: Number(reviewBufferHours.toFixed(1)),
    focusHours: Number(focusHours.toFixed(1)),
    recommendedSessionMinutes,
    sessionsPerWeek,
    allocations,
  };
}

module.exports = { parseSubjects, parseLocalDate, daysUntilDate, buildRevisionPlan };
