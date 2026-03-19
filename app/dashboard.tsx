import { Link, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Linking,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ProgressChart } from "react-native-chart-kit";
import PerformanceGraph from "../components/PerformanceGraph";
import { useHabits } from "../context/HabitContext";
import { useNotificationPrefs } from "../context/NotificationContext";
import { PerformanceContext } from "../context/PerformanceContext";
import { ProfileContext } from "../context/ProfileContext";
import { useTheme, useThemedStyles, type AppThemeTokens } from "../context/theme";
import {
  createLocalBackupFile,
  pickBackupFile,
  restoreBackupFromFile,
} from "../src/utils/backup";
import { resetLocalData } from "../src/utils/resetAppData";
import { getJSON, setJSON } from "../src/utils/storage";

const BADGE_TOAST_DURATION_MS = 1800;
const FOCUS_TIMER_STORAGE_KEY = "focusTimerState";
const DEFAULT_FOCUS_MINUTES = 25;
const MAX_FOCUS_MINUTES = 180;
const POLICY_LAST_UPDATED = "2026-02-19";
const PRIVACY_POLICY_URL = "https://github.com/PriceyLewis/StudentToolKit-OS/blob/main/docs/privacy-policy.md";
const TERMS_OF_USE_URL = "https://github.com/PriceyLewis/StudentToolKit-OS/blob/main/docs/terms-of-use.md";
type CoachingPreset = "strict" | "balanced" | "aggressive";
type CoachingPresetConfig = {
  fitnessDisciplineHighThreshold: number;
  academicLowThreshold: number;
  hustleRisingDeltaThreshold: number;
  careerStagnantDeltaThreshold: number;
  adaptiveWindowSize: number;
  adaptiveMinConsistentEntries: number;
  adaptiveHighThreshold: number;
  adaptiveLowThreshold: number;
};
const COACHING_PRESET_CONFIG: Record<CoachingPreset, CoachingPresetConfig> = {
  strict: {
    fitnessDisciplineHighThreshold: 85,
    academicLowThreshold: 45,
    hustleRisingDeltaThreshold: 8,
    careerStagnantDeltaThreshold: 0,
    adaptiveWindowSize: 6,
    adaptiveMinConsistentEntries: 4,
    adaptiveHighThreshold: 88,
    adaptiveLowThreshold: 35,
  },
  balanced: {
    fitnessDisciplineHighThreshold: 80,
    academicLowThreshold: 50,
    hustleRisingDeltaThreshold: 5,
    careerStagnantDeltaThreshold: 1,
    adaptiveWindowSize: 5,
    adaptiveMinConsistentEntries: 3,
    adaptiveHighThreshold: 85,
    adaptiveLowThreshold: 40,
  },
  aggressive: {
    fitnessDisciplineHighThreshold: 75,
    academicLowThreshold: 60,
    hustleRisingDeltaThreshold: 2,
    careerStagnantDeltaThreshold: 2,
    adaptiveWindowSize: 4,
    adaptiveMinConsistentEntries: 3,
    adaptiveHighThreshold: 82,
    adaptiveLowThreshold: 45,
  },
};
const COACHING_PRESET_OPTIONS: { key: CoachingPreset; label: string }[] = [
  { key: "strict", label: "Strict" },
  { key: "balanced", label: "Balanced" },
  { key: "aggressive", label: "Aggressive" },
];
type Badge = {
  id: string;
  label: string;
  detail: string;
  unlocked: boolean;
};

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseLocalDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const isValidDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const getDaysRemaining = (dateKey: string) => {
  if (!isValidDateKey(dateKey)) {
    return null;
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const getWeekKeyFromDateKey = (dateKey: string) => {
  const date = parseLocalDateKey(dateKey);
  if (!date) {
    return "";
  }
  const day = date.getDay();
  const deltaToMonday = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - deltaToMonday);
  return getLocalDateKey(date);
};

const getRecentDateKeys = (days: number) => {
  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - i);
    keys.push(getLocalDateKey(cursor));
  }
  return keys;
};

type FocusSessionRecord = {
  date: string;
  minutes: number;
};

type DashboardThemePreset = "clean" | "dark" | "midnight";

type FocusTimerState = {
  selectedMinutes: number;
  remainingSeconds: number;
  completedSessions: number;
  sessionHistory: FocusSessionRecord[];
};

const clampFocusMinutes = (value: number) =>
  Math.max(1, Math.min(MAX_FOCUS_MINUTES, Math.round(value || DEFAULT_FOCUS_MINUTES)));

const dashboardThemeOptions: { key: DashboardThemePreset; label: string }[] = [
  { key: "clean", label: "Clean Light" },
  { key: "dark", label: "Dark" },
  { key: "midnight", label: "Midnight" },
];

const getEntryAverage = (entry: {
  academic: number;
  fitness: number;
  hustle: number;
  career: number;
}) => (entry.academic + entry.fitness + entry.hustle + entry.career) / 4;

export default function DashboardScreen() {
  const { COLORS, SPACING, mode: dashboardTheme, setMode: setDashboardTheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    academicScore,
    fitnessScore,
    hustleScore,
    careerScore,
    performanceHistory,
    prevAcademicScore,
    prevFitnessScore,
    prevHustleScore,
    prevCareerScore,
    academicUpdatedAt,
    fitnessUpdatedAt,
    hustleUpdatedAt,
    careerUpdatedAt,
    academicTarget,
    fitnessTarget,
    hustleTarget,
    careerTarget,
    academicDeadline,
    fitnessDeadline,
    hustleDeadline,
    careerDeadline,
    resetPerformanceData,
    rehydratePerformanceData,
  } = useContext(PerformanceContext);
  const { name, resetProfile, rehydrateProfile } = useContext(ProfileContext);
  const {
    activeHabits,
    habitCompletion,
    todayMap,
    doneCount,
    completionPct,
    weightedCompletionPct,
    streakDays,
    toggleHabit,
    resetCurrentWeekHabits,
    resetHabitsData,
    rehydrateHabitsData,
  } = useHabits();
  const {
    prefs,
    setDailyEnabled,
    setWeeklyEnabled,
    resetNotificationPrefs,
    rehydrateNotificationPrefs,
  } = useNotificationPrefs();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(12)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsTranslateY = useRef(new Animated.Value(12)).current;
  const extrasOpacity = useRef(new Animated.Value(0)).current;
  const extrasTranslateY = useRef(new Animated.Value(12)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-8)).current;
  const [toastMessage, setToastMessage] = useState("");
  const previousUnlockedBadgeIdsRef = useRef<Set<string>>(new Set());
  const hasBadgeBaselineRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastQueueRef = useRef<string[]>([]);
  const isToastVisibleRef = useRef(false);
  const averagePulse = useRef(new Animated.Value(1)).current;
  const averageCount = useRef(new Animated.Value(0)).current;
  const weeklySummaryOpacity = useRef(new Animated.Value(0)).current;
  const weeklySummaryTranslateY = useRef(new Animated.Value(10)).current;
  const cardPressAnimsRef = useRef<Record<string, Animated.Value>>({});
  const habitPressAnimsRef = useRef<Record<string, Animated.Value>>({});
  const habitCheckPopAnimsRef = useRef<Record<string, Animated.Value>>({});
  const badgeBounceAnimsRef = useRef<Record<string, Animated.Value>>({});
  const habitCelebrateOpacity = useRef(new Animated.Value(0)).current;
  const habitCelebrateScale = useRef(new Animated.Value(0.94)).current;
  const habitCelebrateTranslateY = useRef(new Animated.Value(8)).current;
  const habitCelebrateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayAverage, setDisplayAverage] = useState(0);
  const [habitCelebrateVisible, setHabitCelebrateVisible] = useState(false);
  const [coachingPreset, setCoachingPreset] = useState<CoachingPreset>("balanced");
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [focusSelectedMinutes, setFocusSelectedMinutes] = useState(DEFAULT_FOCUS_MINUTES);
  const [focusInputValue, setFocusInputValue] = useState(String(DEFAULT_FOCUS_MINUTES));
  const [focusRemainingSeconds, setFocusRemainingSeconds] = useState(DEFAULT_FOCUS_MINUTES * 60);
  const [focusIsRunning, setFocusIsRunning] = useState(false);
  const [focusCompletedSessions, setFocusCompletedSessions] = useState(0);
  const [focusSessionHistory, setFocusSessionHistory] = useState<FocusSessionRecord[]>([]);
  const [focusTimerHydrated, setFocusTimerHydrated] = useState(false);
  const coachingConfig = COACHING_PRESET_CONFIG[coachingPreset];

  const cards = [
    {
      title: "Academic Performance",
      score: academicScore,
      previousScore: prevAcademicScore,
      updatedAt: academicUpdatedAt,
      target: `${academicTarget} hrs/week`,
      href: "/revision" as const,
    },
    {
      title: "Physical Conditioning",
      score: fitnessScore,
      previousScore: prevFitnessScore,
      updatedAt: fitnessUpdatedAt,
      target: `${fitnessTarget} days/week`,
      href: "/gym" as const,
    },
    {
      title: "Income Development",
      score: hustleScore,
      previousScore: prevHustleScore,
      updatedAt: hustleUpdatedAt,
      target: `${hustleTarget} hrs/week`,
      href: "/hustle" as const,
    },
    {
      title: "Professional Profile",
      score: careerScore,
      previousScore: prevCareerScore,
      updatedAt: careerUpdatedAt,
      target: `${careerTarget} score`,
      href: "/cv" as const,
    },
  ];

  const getTrend = (current: number, previous: number) => {
    const delta = current - previous;
    if (delta > 0) return { label: `+${delta}`, color: COLORS.success };
    if (delta < 0) return { label: `${delta}`, color: COLORS.danger };
    return { label: "0", color: COLORS.textMuted };
  };

  const formatUpdatedAt = (value: string) => {
    if (!value) {
      return "Not updated yet";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "Not updated yet";
    }

    return parsed.toLocaleString();
  };

  const average = Math.round(
    (academicScore + fitnessScore + hustleScore + careerScore) / 4
  );
  const previousAverage = Math.round(
    (prevAcademicScore + prevFitnessScore + prevHustleScore + prevCareerScore) / 4
  );
  const averageDelta = average - previousAverage;
  const levelTiers = [
    { level: 1, label: "Starter", min: 0 },
    { level: 2, label: "Disciplined", min: 40 },
    { level: 3, label: "Focused", min: 60 },
    { level: 4, label: "Elite", min: 80 },
    { level: 5, label: "Top 1%", min: 92 },
  ] as const;
  const currentLevelTier =
    [...levelTiers].reverse().find((tier) => average >= tier.min) ?? levelTiers[0];
  const nextLevelTier = levelTiers.find((tier) => tier.level === currentLevelTier.level + 1) ?? null;
  const performanceLevel = `Level ${currentLevelTier.level}: ${currentLevelTier.label}`;
  const levelProgressPct = nextLevelTier
    ? Math.round(
        ((average - currentLevelTier.min) / Math.max(1, nextLevelTier.min - currentLevelTier.min)) * 100
      )
    : 100;
  const targetScoreCaps = {
    academic: Math.min(academicTarget * 10, 100),
    fitness: Math.min(fitnessTarget * 20, 100),
    hustle: Math.min(hustleTarget * 10, 100),
    career: Math.min(careerTarget, 100),
  };
  const targetProgressPct = Math.round(
    ([
      academicScore / Math.max(1, targetScoreCaps.academic),
      fitnessScore / Math.max(1, targetScoreCaps.fitness),
      hustleScore / Math.max(1, targetScoreCaps.hustle),
      careerScore / Math.max(1, targetScoreCaps.career),
    ].reduce((sum, ratio) => sum + Math.min(1, Math.max(0, ratio)), 0) /
      4) *
      100
  );
  const dailyAutoScore = Math.round(weightedCompletionPct * 0.55 + targetProgressPct * 0.45);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const history30 = useMemo(
    () => performanceHistory.slice(Math.max(0, performanceHistory.length - 30)),
    [performanceHistory]
  );
  const monthHistory = useMemo(
    () =>
      performanceHistory
        .map((entry) => ({
          entry,
          parsedDate: parseLocalDateKey(entry.date),
        }))
        .filter(
          (item) =>
            item.parsedDate &&
            item.parsedDate.getFullYear() === currentYear &&
            item.parsedDate.getMonth() === currentMonth
        )
        .sort((a, b) => (a.parsedDate?.getTime() ?? 0) - (b.parsedDate?.getTime() ?? 0))
        .map((item) => item.entry),
    [performanceHistory, currentMonth, currentYear]
  );
  const monthlySummary = useMemo(() => {
    if (monthHistory.length === 0) {
      return {
        hasData: false,
        bestArea: "No data yet",
        improvementPct: 0,
      };
    }

    const areaAverages = {
      Academic: monthHistory.reduce((sum, item) => sum + item.academic, 0) / monthHistory.length,
      Fitness: monthHistory.reduce((sum, item) => sum + item.fitness, 0) / monthHistory.length,
      Hustle: monthHistory.reduce((sum, item) => sum + item.hustle, 0) / monthHistory.length,
      Career: monthHistory.reduce((sum, item) => sum + item.career, 0) / monthHistory.length,
    };
    const sortedAreas = Object.entries(areaAverages).sort((a, b) => b[1] - a[1]);
    const firstAverage = getEntryAverage(monthHistory[0]);
    const latestAverage = getEntryAverage(monthHistory[monthHistory.length - 1]);
    const rawImprovementPct =
      firstAverage === 0
        ? latestAverage > 0
          ? 100
          : 0
        : ((latestAverage - firstAverage) / firstAverage) * 100;

    return {
      hasData: true,
      bestArea: `${sortedAreas[0][0]} ${Math.round(sortedAreas[0][1])}/100`,
      improvementPct: Math.round(rawImprovementPct),
    };
  }, [monthHistory]);
  const habitsCompletedThisMonth = useMemo(
    () =>
      Object.entries(habitCompletion).reduce((total, [dateKey, map]) => {
        const parsedDate = parseLocalDateKey(dateKey);
        if (!parsedDate) {
          return total;
        }
        if (
          parsedDate.getFullYear() !== currentYear ||
          parsedDate.getMonth() !== currentMonth
        ) {
          return total;
        }

        const completedCount = Object.values(map).filter((value) => !!value).length;
        return total + completedCount;
      }, 0),
    [habitCompletion, currentMonth, currentYear]
  );
  const momentumStatus = useMemo(() => {
    if (activeHabits.length === 0) {
      return {
        tone: "warning",
        message: "Momentum slipping - add 2 habits to start your streak.",
      };
    }

    const sampleWindowDays = Math.min(7, Math.max(3, streakDays + 1));
    let strongDays = 0;
    for (let i = 0; i < sampleWindowDays; i += 1) {
      const cursor = new Date();
      cursor.setDate(cursor.getDate() - i);
      const dayMap = habitCompletion[getLocalDateKey(cursor)] || {};
      const completed = activeHabits.filter((habit) => !!dayMap[habit.id]).length;
      if (completed / activeHabits.length >= 0.6) {
        strongDays += 1;
      }
    }

    if (streakDays >= 3 || strongDays >= Math.ceil(sampleWindowDays * 0.7)) {
      return {
        tone: "positive",
        message: `You're on a ${Math.max(streakDays, strongDays)}-day momentum streak`,
      };
    }

    const targetDoneToday = Math.min(2, activeHabits.length);
    const needed = Math.max(0, targetDoneToday - doneCount);
    return {
      tone: "warning",
      message:
        needed === 0
          ? "Momentum rebuilding - lock in your current pace today."
          : `Momentum slipping - complete ${needed} habit${needed === 1 ? "" : "s"} today`,
    };
  }, [activeHabits, doneCount, habitCompletion, streakDays]);
  const focusMinutesLifetime = useMemo(
    () => focusSessionHistory.reduce((sum, item) => sum + item.minutes, 0),
    [focusSessionHistory]
  );
  const perfectWeeksCount = useMemo(() => {
    if (activeHabits.length === 0) {
      return 0;
    }
    const weekScores = new Map<string, { doneWeight: number; totalWeight: number }>();
    const totalDailyWeight = activeHabits.reduce((sum, habit) => {
      const difficulty = habit.difficulty ?? "medium";
      return sum + (difficulty === "hard" ? 2 : difficulty === "easy" ? 1 : 1.5);
    }, 0);
    Object.entries(habitCompletion).forEach(([dateKey, day]) => {
      const weekKey = getWeekKeyFromDateKey(dateKey);
      if (!weekKey) {
        return;
      }
      const current = weekScores.get(weekKey) ?? { doneWeight: 0, totalWeight: 0 };
      const doneWeight = activeHabits.reduce((sum, habit) => {
        const difficulty = habit.difficulty ?? "medium";
        const weight = difficulty === "hard" ? 2 : difficulty === "easy" ? 1 : 1.5;
        return sum + (day[habit.id] ? weight : 0);
      }, 0);
      current.doneWeight += doneWeight;
      current.totalWeight += totalDailyWeight;
      weekScores.set(weekKey, current);
    });
    return [...weekScores.values()].filter(
      (week) => week.totalWeight > 0 && Math.round((week.doneWeight / week.totalWeight) * 100) >= 95
    ).length;
  }, [activeHabits, habitCompletion]);
  const consistencyStreak30 = useMemo(() => {
    if (activeHabits.length === 0) {
      return 0;
    }
    let streak = 0;
    for (const key of getRecentDateKeys(30)) {
      const day = habitCompletion[key] || {};
      const completed = activeHabits.filter((habit) => !!day[habit.id]).length;
      const ratio = activeHabits.length ? completed / activeHabits.length : 0;
      if (ratio >= 0.6) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [activeHabits, habitCompletion]);

  const badges = useMemo<Badge[]>(
    () => [
      {
        id: "starter",
        label: "Starter Momentum",
        detail: "Reach an average score of 25.",
        unlocked: average >= 25,
      },
      {
        id: "high",
        label: "High Performer",
        detail: "Reach an average score of 70.",
        unlocked: average >= 70,
      },
      {
        id: "elite",
        label: "Elite 80 Club",
        detail: "Keep all 4 categories at 80+.",
        unlocked: [academicScore, fitnessScore, hustleScore, careerScore].every(
          (score) => score >= 80
        ),
      },
      {
        id: "targets",
        label: "Target Aligned",
        detail: "Meet all current target thresholds.",
        unlocked:
          academicScore >= Math.min(academicTarget * 10, 100) &&
          fitnessScore >= Math.min(fitnessTarget * 20, 100) &&
          hustleScore >= Math.min(hustleTarget * 10, 100) &&
          careerScore >= careerTarget,
      },
      {
        id: "discipline",
        label: "Daily Discipline",
        detail: "Complete all daily habits for 7 days.",
        unlocked: streakDays >= 7,
      },
      {
        id: "focus100",
        label: "First 100 Focus Minutes",
        detail: "Complete 100+ focus minutes.",
        unlocked: focusMinutesLifetime >= 100,
      },
      {
        id: "elite-level",
        label: "Elite Level Reached",
        detail: "Reach Level 4: Elite.",
        unlocked: currentLevelTier.level >= 4,
      },
      {
        id: "perfect-weeks",
        label: "5 Perfect Weeks",
        detail: "Hit 95%+ weighted habit consistency in 5 weeks.",
        unlocked: perfectWeeksCount >= 5,
      },
      {
        id: "top-1",
        label: "Top 1% Level",
        detail: "Reach Level 5: Top 1%.",
        unlocked: currentLevelTier.level >= 5,
      },
      {
        id: "perfect-weeks-10",
        label: "10 Perfect Weeks",
        detail: "Hit 95%+ weighted habit consistency in 10 weeks.",
        unlocked: perfectWeeksCount >= 10,
      },
      {
        id: "consistency-30",
        label: "30-Day Consistency Streak",
        detail: "Maintain 60%+ daily habit completion for 30 days.",
        unlocked: consistencyStreak30 >= 30,
      },
    ],
    [
      academicScore,
      fitnessScore,
      hustleScore,
      careerScore,
      academicTarget,
      fitnessTarget,
      hustleTarget,
      careerTarget,
      average,
      streakDays,
      currentLevelTier.level,
      focusMinutesLifetime,
      perfectWeeksCount,
      consistencyStreak30,
    ]
  );
  const unlockedBadgesCount = badges.filter((badge) => badge.unlocked).length;
  const overallData = useMemo(
    () =>
      history30.map((entry) => ({
        date: entry.date,
        value: (entry.academic + entry.fitness + entry.hustle + entry.career) / 4,
      })),
    [history30]
  );
  const consistency30 = Math.round((history30.length / 30) * 100);
  const overallRingProgress = Math.max(0.02, Math.min(1, average / 100));
  const isFirstMomentumMoment = Boolean(name?.trim()) && performanceHistory.length <= 1 && streakDays === 0;
  const focusTodayKey = getLocalDateKey(new Date());
  const focusMinutesThisWeek = useMemo(() => {
    const recentKeys = new Set(getRecentDateKeys(7));
    return focusSessionHistory.reduce(
      (sum, session) => (recentKeys.has(session.date) ? sum + session.minutes : sum),
      0
    );
  }, [focusSessionHistory]);
  const focusHoursThisWeek = Math.round((focusMinutesThisWeek / 60) * 10) / 10;
  const focusSessionsToday = useMemo(
    () => focusSessionHistory.filter((session) => session.date === focusTodayKey).length,
    [focusSessionHistory, focusTodayKey]
  );
  const focusStreakDays = useMemo(() => {
    const sessionsByDay = new Set(focusSessionHistory.map((session) => session.date));
    let streak = 0;
    for (const key of getRecentDateKeys(365)) {
      if (!sessionsByDay.has(key)) {
        break;
      }
      streak += 1;
    }
    return streak;
  }, [focusSessionHistory]);
  const focusClockLabel = `${Math.floor(focusRemainingSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(focusRemainingSeconds % 60).toString().padStart(2, "0")}`;
  const focusSessionProgressPct = Math.round(
    ((focusSelectedMinutes * 60 - focusRemainingSeconds) / Math.max(1, focusSelectedMinutes * 60)) * 100
  );
  const dashboardThemeSurface =
    dashboardTheme === "midnight"
      ? { page: "#081226", card: "#0F1B33", border: "#1E335A", text: "#E5ECFF", subtext: "#9FB0D4", accent: "#22D3EE" }
      : dashboardTheme === "dark"
        ? { page: "#101317", card: "#171C22", border: "#293240", text: "#F3F4F6", subtext: "#AAB3C2", accent: "#60A5FA" }
        : { page: COLORS.backgroundAlt, card: COLORS.card, border: COLORS.border, text: COLORS.textPrimary, subtext: COLORS.textMuted, accent: COLORS.primary };
  const deadlineCountdowns = useMemo(
    () => [
      { label: "Academic", deadline: academicDeadline },
      { label: "Fitness", deadline: fitnessDeadline },
      { label: "Hustle", deadline: hustleDeadline },
      { label: "Career", deadline: careerDeadline },
    ]
      .map((item) => ({ ...item, daysRemaining: getDaysRemaining(item.deadline) }))
      .filter((item) => item.deadline),
    [academicDeadline, careerDeadline, fitnessDeadline, hustleDeadline]
  );
  const nearestDeadline = deadlineCountdowns
    .filter((item) => item.daysRemaining !== null)
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999))[0];
  const habitStreakById = useMemo(() => {
    const recentKeys = getRecentDateKeys(365);
    const streaks: Record<string, number> = {};

    activeHabits.forEach((habit) => {
      let streak = 0;
      for (const key of recentKeys) {
        const day = habitCompletion[key] || {};
        if (!day[habit.id]) {
          break;
        }
        streak += 1;
      }
      streaks[habit.id] = streak;
    });

    return streaks;
  }, [activeHabits, habitCompletion]);
  const monthAreaSummary = useMemo(() => {
    if (monthHistory.length === 0) {
      return { best: "No data yet", worst: "No data yet" };
    }

    const avg = {
      Academic: monthHistory.reduce((sum, item) => sum + item.academic, 0) / monthHistory.length,
      Fitness: monthHistory.reduce((sum, item) => sum + item.fitness, 0) / monthHistory.length,
      Hustle: monthHistory.reduce((sum, item) => sum + item.hustle, 0) / monthHistory.length,
      Career: monthHistory.reduce((sum, item) => sum + item.career, 0) / monthHistory.length,
    };

    const sorted = Object.entries(avg).sort((a, b) => b[1] - a[1]);
    return {
      best: `${sorted[0][0]} ${Math.round(sorted[0][1])}/100`,
      worst: `${sorted[sorted.length - 1][0]} ${Math.round(sorted[sorted.length - 1][1])}/100`,
    };
  }, [monthHistory]);
  const unlockedBadgeIds = useMemo(
    () => badges.filter((badge) => badge.unlocked).map((badge) => badge.id),
    [badges]
  );
  const coachingInsights = useMemo(() => {
    const insights: string[] = [];
    const hustleDelta = hustleScore - prevHustleScore;
    const careerDelta = careerScore - prevCareerScore;

    if (
      fitnessScore >= coachingConfig.fitnessDisciplineHighThreshold &&
      academicScore <= coachingConfig.academicLowThreshold
    ) {
      insights.push(
        "High physical discipline detected. Apply same structure to Academic."
      );
    }

    if (
      hustleDelta >= coachingConfig.hustleRisingDeltaThreshold &&
      careerDelta <= coachingConfig.careerStagnantDeltaThreshold
    ) {
      insights.push(
        "Income momentum is rising. Consider aligning it with long-term professional positioning."
      );
    }

    return insights;
  }, [academicScore, careerScore, coachingConfig, fitnessScore, hustleScore, prevCareerScore, prevHustleScore]);
  const adaptiveTargetSuggestions = useMemo(() => {
    type AreaMetric = {
      key: "academic" | "fitness" | "hustle" | "career";
      label: "Academic" | "Fitness" | "Hustle" | "Career";
      score: number;
    };

    const areaMetrics: AreaMetric[] = [
      { key: "academic", label: "Academic", score: academicScore },
      { key: "fitness", label: "Fitness", score: fitnessScore },
      { key: "hustle", label: "Hustle", score: hustleScore },
      { key: "career", label: "Career", score: careerScore },
    ];
    const recentEntries = performanceHistory.slice(
      Math.max(0, performanceHistory.length - coachingConfig.adaptiveWindowSize)
    );
    const suggestions: string[] = [];

    areaMetrics.forEach((area) => {
      const historyWithCurrent = [...recentEntries.map((entry) => entry[area.key]), area.score].slice(
        -coachingConfig.adaptiveWindowSize
      );
      const allHigh =
        historyWithCurrent.length >= coachingConfig.adaptiveMinConsistentEntries &&
        historyWithCurrent.every((value) => value >= coachingConfig.adaptiveHighThreshold);
      const allLow =
        historyWithCurrent.length >= coachingConfig.adaptiveMinConsistentEntries &&
        historyWithCurrent.every((value) => value < coachingConfig.adaptiveLowThreshold);

      if (allHigh) {
        suggestions.push(
          `${area.label} performance is consistently 85+. Consider raising your ${area.label.toLowerCase()} target.`
        );
      } else if (allLow) {
        suggestions.push(
          `${area.label} is currently below 40. Lower the target temporarily to build momentum.`
        );
      }
    });

    return suggestions;
  }, [academicScore, careerScore, coachingConfig, fitnessScore, hustleScore, performanceHistory]);

  useEffect(() => {
    const subscription = averageCount.addListener(({ value }) => {
      setDisplayAverage(Math.round(value));
    });
    return () => {
      averageCount.removeListener(subscription);
    };
  }, [averageCount]);

  useEffect(() => {
    Animated.timing(averageCount, {
      toValue: average,
      duration: 450,
      useNativeDriver: false,
    }).start();

    if (averageDelta > 0) {
      averagePulse.setValue(0.94);
      Animated.sequence([
        Animated.spring(averagePulse, {
          toValue: 1.08,
          speed: 24,
          bounciness: 12,
          useNativeDriver: true,
        }),
        Animated.spring(averagePulse, {
          toValue: 1,
          speed: 24,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      averagePulse.setValue(1);
    }
  }, [average, averageCount, averageDelta, averagePulse]);

  useEffect(() => {
    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(cardsTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(extrasOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(extrasTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    cardsOpacity,
    cardsTranslateY,
    extrasOpacity,
    extrasTranslateY,
    headerOpacity,
    headerTranslateY,
  ]);

  useEffect(() => {
    weeklySummaryOpacity.setValue(0);
    weeklySummaryTranslateY.setValue(10);
    Animated.parallel([
      Animated.timing(weeklySummaryOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(weeklySummaryTranslateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [weeklySummaryOpacity, weeklySummaryTranslateY, completionPct, streakDays, history30.length]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (focusIntervalRef.current) {
        clearInterval(focusIntervalRef.current);
      }
      if (habitCelebrateTimeoutRef.current) {
        clearTimeout(habitCelebrateTimeoutRef.current);
      }
      toastQueueRef.current = [];
      isToastVisibleRef.current = false;
    };
  }, [habitCelebrateTimeoutRef]);

  const showQueuedToast = useCallback((message: string) => {
    setToastMessage(message);
    toastOpacity.setValue(0);
    toastTranslateY.setValue(-8);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -8,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          isToastVisibleRef.current = false;
          return;
        }

        setToastMessage("");
        const nextMessage = toastQueueRef.current.shift();
        if (nextMessage) {
          showQueuedToast(nextMessage);
        } else {
          isToastVisibleRef.current = false;
        }
      });
    }, BADGE_TOAST_DURATION_MS);
  }, [toastOpacity, toastTranslateY]);

  const enqueueBadgeToast = useCallback((message: string) => {
    if (isToastVisibleRef.current) {
      toastQueueRef.current.push(message);
      return;
    }

    isToastVisibleRef.current = true;
    showQueuedToast(message);
  }, [showQueuedToast]);

  useEffect(() => {
    const unlockedNow = new Set(unlockedBadgeIds);

    if (!hasBadgeBaselineRef.current) {
      previousUnlockedBadgeIdsRef.current = unlockedNow;
      hasBadgeBaselineRef.current = true;
      return;
    }

    const newlyUnlockedBadges = badges.filter(
      (badge) => badge.unlocked && !previousUnlockedBadgeIdsRef.current.has(badge.id)
    );

    previousUnlockedBadgeIdsRef.current = unlockedNow;

    newlyUnlockedBadges.forEach((badge) => {
      if (!badgeBounceAnimsRef.current[badge.id]) {
        badgeBounceAnimsRef.current[badge.id] = new Animated.Value(1);
      }
      const bounce = badgeBounceAnimsRef.current[badge.id];
      bounce.setValue(0.9);
      Animated.sequence([
        Animated.spring(bounce, {
          toValue: 1.08,
          speed: 22,
          bounciness: 15,
          useNativeDriver: true,
        }),
        Animated.spring(bounce, {
          toValue: 1,
          speed: 22,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]).start();
      enqueueBadgeToast(`Badge unlocked: ${badge.label}`);
    });
  }, [badges, enqueueBadgeToast, unlockedBadgeIds]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await getJSON<Partial<FocusTimerState> | null>(FOCUS_TIMER_STORAGE_KEY, null);
      if (!mounted) {
        return;
      }

      const selectedMinutes = clampFocusMinutes(Number(stored?.selectedMinutes ?? DEFAULT_FOCUS_MINUTES));
      const remainingSeconds = Math.max(
        0,
        Math.round(Number(stored?.remainingSeconds ?? selectedMinutes * 60))
      );
      const sessionHistory = Array.isArray(stored?.sessionHistory)
        ? (stored?.sessionHistory as FocusSessionRecord[])
            .filter((entry) => typeof entry?.date === "string" && Number.isFinite(Number(entry?.minutes)))
            .map((entry) => ({
              date: entry.date,
              minutes: clampFocusMinutes(Number(entry.minutes)),
            }))
        : [];

      setFocusSelectedMinutes(selectedMinutes);
      setFocusInputValue(String(selectedMinutes));
      setFocusRemainingSeconds(remainingSeconds || selectedMinutes * 60);
      setFocusCompletedSessions(Math.max(0, Math.round(Number(stored?.completedSessions ?? 0))));
      setFocusSessionHistory(sessionHistory);
      setFocusTimerHydrated(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!focusTimerHydrated) {
      return;
    }

    const nextFocusState: FocusTimerState = {
      selectedMinutes: focusSelectedMinutes,
      remainingSeconds: focusRemainingSeconds,
      completedSessions: focusCompletedSessions,
      sessionHistory: focusSessionHistory.slice(-400),
    };
    setJSON(FOCUS_TIMER_STORAGE_KEY, nextFocusState);
  }, [
    focusCompletedSessions,
    focusRemainingSeconds,
    focusSelectedMinutes,
    focusSessionHistory,
    focusTimerHydrated,
  ]);

  useEffect(() => {
    if (!focusIsRunning) {
      if (focusIntervalRef.current) {
        clearInterval(focusIntervalRef.current);
        focusIntervalRef.current = null;
      }
      return;
    }

    focusIntervalRef.current = setInterval(() => {
      setFocusRemainingSeconds((current) => {
        if (current <= 1) {
          if (focusIntervalRef.current) {
            clearInterval(focusIntervalRef.current);
            focusIntervalRef.current = null;
          }
          setFocusIsRunning(false);
          setFocusCompletedSessions((value) => value + 1);
          setFocusSessionHistory((history) => [
            ...history.slice(-399),
            { date: getLocalDateKey(new Date()), minutes: focusSelectedMinutes },
          ]);
          enqueueBadgeToast(`Session complete \uD83D\uDD25`);
          return focusSelectedMinutes * 60;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (focusIntervalRef.current) {
        clearInterval(focusIntervalRef.current);
        focusIntervalRef.current = null;
      }
    };
  }, [enqueueBadgeToast, focusIsRunning, focusSelectedMinutes]);

  const applyFocusDuration = useCallback(
    (rawValue: string) => {
      const parsed = clampFocusMinutes(parseInt(rawValue, 10) || DEFAULT_FOCUS_MINUTES);
      setFocusSelectedMinutes(parsed);
      setFocusInputValue(String(parsed));
      if (!focusIsRunning) {
        setFocusRemainingSeconds(parsed * 60);
      }
    },
    [focusIsRunning]
  );

  const toggleFocusTimer = useCallback(() => {
    if (focusRemainingSeconds <= 0) {
      setFocusRemainingSeconds(focusSelectedMinutes * 60);
    }
    setFocusIsRunning((value) => !value);
  }, [focusRemainingSeconds, focusSelectedMinutes]);

  const resetFocusTimer = useCallback(() => {
    setFocusIsRunning(false);
    setFocusRemainingSeconds(focusSelectedMinutes * 60);
  }, [focusSelectedMinutes]);

  const runReset = useCallback(
    async () => {
      await resetLocalData();
      await resetNotificationPrefs();
      await resetHabitsData();
      await resetPerformanceData();
      await resetProfile();

      router.replace("/onboarding");
    },
    [
      resetHabitsData,
      resetNotificationPrefs,
      resetPerformanceData,
      resetProfile,
      router,
    ]
  );

  const confirmResetLocalData = useCallback(() => {
    Alert.alert("Reset local data?", "This will clear your local app data and start fresh.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          runReset().catch(() => {});
        },
      },
    ]);
  }, [runReset]);

  const rehydrateAllData = useCallback(async () => {
    await Promise.all([
      rehydrateProfile(),
      rehydratePerformanceData(),
      rehydrateHabitsData(),
      rehydrateNotificationPrefs(),
    ]);
  }, [
    rehydrateHabitsData,
    rehydrateNotificationPrefs,
    rehydratePerformanceData,
    rehydrateProfile,
  ]);

  const handleExportBackup = useCallback(async () => {
    try {
      const file = await createLocalBackupFile();
      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert("Backup created", `Saved to: ${file.uri}`);
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Export local backup",
      });
    } catch {
      Alert.alert("Backup failed", "Could not create local backup.");
    }
  }, []);

  const performRestoreBackup = useCallback(async () => {
    try {
      const file = await pickBackupFile();
      const result = await restoreBackupFromFile(file);
      await rehydrateAllData();
      Alert.alert(
        "Backup restored",
        `Restored ${result.restoredKeys} keys from ${result.exportedAt || "backup file"}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("cancel")) {
        return;
      }
      Alert.alert("Restore failed", "Could not restore data from this backup file.");
    }
  }, [rehydrateAllData]);

  const confirmRestoreBackup = useCallback(() => {
    Alert.alert("Restore local backup?", "Current local data will be replaced.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restore",
        style: "destructive",
        onPress: () => {
          performRestoreBackup().catch(() => {});
        },
      },
    ]);
  }, [performRestoreBackup]);

  const openPrivacyPolicyUrl = useCallback(async () => {
    const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
    if (!canOpen) {
      Alert.alert("Policy URL unavailable", "Update the privacy policy URL in dashboard settings.");
      return;
    }

    await Linking.openURL(PRIVACY_POLICY_URL);
  }, []);

  const getCardPressAnim = useCallback((id: string) => {
    if (!cardPressAnimsRef.current[id]) {
      cardPressAnimsRef.current[id] = new Animated.Value(1);
    }
    return cardPressAnimsRef.current[id];
  }, []);

  const getHabitPressAnim = useCallback((id: string) => {
    if (!habitPressAnimsRef.current[id]) {
      habitPressAnimsRef.current[id] = new Animated.Value(1);
    }
    return habitPressAnimsRef.current[id];
  }, []);

  const getHabitCheckPopAnim = useCallback((id: string) => {
    if (!habitCheckPopAnimsRef.current[id]) {
      habitCheckPopAnimsRef.current[id] = new Animated.Value(1);
    }
    return habitCheckPopAnimsRef.current[id];
  }, []);

  const getBadgeBounceAnim = useCallback((id: string) => {
    if (!badgeBounceAnimsRef.current[id]) {
      badgeBounceAnimsRef.current[id] = new Animated.Value(1);
    }
    return badgeBounceAnimsRef.current[id];
  }, []);

  const animatePress = useCallback((value: Animated.Value, toValue: number) => {
    Animated.spring(value, {
      toValue,
      speed: 35,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }, []);

  const animateHabitTick = useCallback((id: string) => {
    const pop = getHabitCheckPopAnim(id);
    pop.setValue(0.8);
    Animated.sequence([
      Animated.spring(pop, {
        toValue: 1.2,
        speed: 26,
        bounciness: 14,
        useNativeDriver: true,
      }),
      Animated.spring(pop, {
        toValue: 1,
        speed: 24,
        bounciness: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [getHabitCheckPopAnim]);

  const celebrateAllHabitsComplete = useCallback(() => {
    if (habitCelebrateTimeoutRef.current) {
      clearTimeout(habitCelebrateTimeoutRef.current);
      habitCelebrateTimeoutRef.current = null;
    }

    setHabitCelebrateVisible(true);
    habitCelebrateOpacity.setValue(0);
    habitCelebrateScale.setValue(0.94);
    habitCelebrateTranslateY.setValue(8);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(habitCelebrateOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(habitCelebrateScale, {
          toValue: 1,
          speed: 24,
          bounciness: 10,
          useNativeDriver: true,
        }),
        Animated.timing(habitCelebrateTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(habitCelebrateOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(habitCelebrateTranslateY, {
          toValue: -6,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        setHabitCelebrateVisible(false);
      }
    });
  }, [habitCelebrateOpacity, habitCelebrateScale, habitCelebrateTranslateY]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        isCompact ? styles.containerCompact : null,
        { backgroundColor: dashboardThemeSurface.page },
      ]}
    >
      {toastMessage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}
      {habitCelebrateVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.habitCelebrateBanner,
            {
              opacity: habitCelebrateOpacity,
              transform: [
                { translateY: habitCelebrateTranslateY },
                { scale: habitCelebrateScale },
              ],
            },
          ]}
        >
          <Text style={styles.habitCelebrateText}>
            {"\uD83C\uDF89\uD83C\uDF89\uD83C\uDF89"} All habits complete. Momentum locked in.
          </Text>
        </Animated.View>
      ) : null}

      <Animated.View
        style={{
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <Text style={styles.welcomeText}>
          {isFirstMomentumMoment
            ? `Welcome ${name || "Student"}. Let's build momentum.`
            : `Welcome back, ${name || "Student"}`}
        </Text>
        <View
          style={[
            styles.heroCard,
            isCompact ? styles.heroCardCompact : null,
            { backgroundColor: dashboardThemeSurface.card, borderColor: dashboardThemeSurface.border },
          ]}
        >
          <Text style={styles.heroEyebrow}>Performance Command Center</Text>
          <View style={styles.heroHeaderRow}>
            <View>
              <Text style={[styles.title, isCompact ? styles.titleCompact : null]}>Dashboard</Text>
              <Text style={styles.subtitle}>Performance Level: {performanceLevel}</Text>
            </View>
            <Animated.View style={[styles.scoreRingWrap, { transform: [{ scale: averagePulse }] }]}>
              <ProgressChart
                data={{ labels: ["Overall"], data: [overallRingProgress] }}
                width={isCompact ? 112 : 126}
                height={isCompact ? 112 : 126}
                strokeWidth={10}
                radius={36}
                hideLegend
                chartConfig={{
                  backgroundGradientFrom: dashboardThemeSurface.card,
                  backgroundGradientTo: dashboardThemeSurface.card,
                  color: (opacity = 1) => {
                    if (average >= 80) {
                      return `rgba(22, 163, 74, ${opacity})`;
                    }
                    if (dashboardTheme === "midnight") {
                      return `rgba(34, 211, 238, ${opacity})`;
                    }
                    if (dashboardTheme === "dark") {
                      return `rgba(96, 165, 250, ${opacity})`;
                    }
                    return `rgba(37, 99, 235, ${opacity})`;
                  },
                  labelColor: () => COLORS.textMuted,
                }}
                style={styles.scoreRingChart}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.scoreRingCenter,
                  { backgroundColor: dashboardThemeSurface.card, borderColor: dashboardThemeSurface.border },
                ]}
              >
                <Text style={[styles.scoreRingValue, { color: dashboardThemeSurface.text }]}>
                  {displayAverage}
                </Text>
                <Text style={[styles.scoreRingLabel, { color: dashboardThemeSurface.subtext }]}>Overall</Text>
              </View>
            </Animated.View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(8, Math.min(100, Math.max(0, levelProgressPct)))}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {nextLevelTier
              ? `Next level: Level ${nextLevelTier.level} ${nextLevelTier.label} at ${nextLevelTier.min}+`
              : "Top tier unlocked"}
          </Text>
          <Text style={styles.progressText}>
            Daily auto score: {dailyAutoScore}/100 (habits + target progress)
          </Text>
          {averageDelta > 0 ? (
            <Text style={styles.positiveDeltaText}>+{averageDelta} since last update</Text>
          ) : null}
          <View
            style={[
              styles.momentumBanner,
              momentumStatus.tone === "positive" ? styles.momentumBannerPositive : null,
            ]}
          >
            <Text style={styles.momentumBannerText}>
              {momentumStatus.tone === "positive" ? "\uD83D\uDD25" : "\u26A0"}{" "}
              {momentumStatus.message}
            </Text>
          </View>
          <View style={styles.heroSnapshotRow}>
            <View style={styles.heroSnapshotCard}>
              <Text style={styles.heroSnapshotLabel}>Target alignment</Text>
              <Text style={styles.heroSnapshotValue}>{targetProgressPct}%</Text>
            </View>
            <View style={styles.heroSnapshotCard}>
              <Text style={styles.heroSnapshotLabel}>Focus minutes</Text>
              <Text style={styles.heroSnapshotValue}>{focusMinutesLifetime}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiRow, isCompact ? styles.kpiRowCompact : null]}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Consistency</Text>
            <Text style={styles.kpiValue}>{consistency30}%</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Badges</Text>
            <Text style={styles.kpiValue}>{unlockedBadgesCount}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Streak</Text>
            <Text style={styles.kpiValue}>{streakDays}d</Text>
          </View>
        </View>

        <View style={[styles.topActionsRow, isCompact ? styles.topActionsRowCompact : null]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.topActionButton, isCompact ? styles.topActionButtonCompact : null]}
            onPress={() => router.push("/weekly-review")}
          >
            <Text style={styles.topActionKicker}>Review</Text>
            <Text style={styles.topActionText}>Weekly Review</Text>
            <Text style={styles.topActionSubtext}>Summarise the week and reset priorities.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.topActionButton, isCompact ? styles.topActionButtonCompact : null]}
            onPress={() => router.push("/analytics" as any)}
          >
            <Text style={styles.topActionKicker}>Trends</Text>
            <Text style={styles.topActionText}>Analytics</Text>
            <Text style={styles.topActionSubtext}>Show momentum, consistency, and performance signals.</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.weeklySummaryCard,
            isCompact ? styles.weeklySummaryCardCompact : null,
            { backgroundColor: dashboardThemeSurface.card, borderColor: dashboardThemeSurface.border },
          ]}
        >
          <Text style={[styles.weeklySummaryTitle, { color: dashboardThemeSurface.text }]}>Theme Preset</Text>
          <Text style={[styles.weeklySummaryBody, { color: dashboardThemeSurface.subtext }]}>
            Local dashboard theme preset.
          </Text>
          <View style={styles.coachingPresetRow}>
            {dashboardThemeOptions.map((option) => {
              const isActive = option.key === dashboardTheme;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.85}
                  style={[
                    styles.coachingPresetButton,
                    {
                      backgroundColor: dashboardThemeSurface.page,
                      borderColor: isActive ? dashboardThemeSurface.accent : dashboardThemeSurface.border,
                    },
                  ]}
                  onPress={() => setDashboardTheme(option.key)}
                >
                  <Text
                    style={[
                      styles.coachingPresetButtonText,
                      { color: isActive ? dashboardThemeSurface.accent : dashboardThemeSurface.subtext },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.weeklySummaryCard,
            isCompact ? styles.weeklySummaryCardCompact : null,
            { backgroundColor: dashboardThemeSurface.card, borderColor: dashboardThemeSurface.border },
          ]}
        >
          <Text style={[styles.weeklySummaryTitle, { color: dashboardThemeSurface.text }]}>Goal Deadlines</Text>
          {deadlineCountdowns.length === 0 ? (
            <View style={styles.emptyStateCompact}>
              <Text style={styles.emptyStateTitle}>No deadlines set</Text>
              <Text style={styles.emptyStateBody}>
                Add deadlines in Targets (YYYY-MM-DD) to show countdown urgency here.
              </Text>
            </View>
          ) : (
            <View style={styles.monthlyStatsGrid}>
              {deadlineCountdowns.map((item) => (
                <View key={`${item.label}-${item.deadline}`} style={styles.monthlyStatItem}>
                  <Text style={styles.kpiLabel}>{item.label}</Text>
                  <Text style={styles.kpiValue}>
                    {item.daysRemaining === null
                      ? "Invalid date"
                      : item.daysRemaining < 0
                        ? `${Math.abs(item.daysRemaining)}d overdue`
                        : item.daysRemaining === 0
                          ? "Due today"
                          : `${item.daysRemaining}d left`}
                  </Text>
                  <Text style={styles.progressText}>{item.deadline}</Text>
                </View>
              ))}
              {nearestDeadline ? (
                <View style={styles.monthlyStatItem}>
                  <Text style={styles.kpiLabel}>Nearest</Text>
                  <Text style={styles.kpiValue}>
                    {nearestDeadline.label}
                    {nearestDeadline.daysRemaining !== null
                      ? ` (${nearestDeadline.daysRemaining <= 0 ? "urgent" : `${nearestDeadline.daysRemaining}d`})`
                      : ""}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View
          style={[
            styles.weeklySummaryCard,
            isCompact ? styles.weeklySummaryCardCompact : null,
            { backgroundColor: dashboardThemeSurface.card, borderColor: dashboardThemeSurface.border },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.weeklySummaryTitle}>Focus Timer</Text>
            <Text style={styles.sectionMeta}>Total this week: {focusHoursThisWeek}h</Text>
          </View>
          <Text style={styles.focusTimerClock}>{focusClockLabel}</Text>
          <Text style={styles.weeklySummaryBody}>
            {focusSelectedMinutes} min sessions | {focusCompletedSessions} total | {focusSessionsToday} today |
            {" "}focus streak {focusStreakDays} day{focusStreakDays === 1 ? "" : "s"}
          </Text>
          <View style={styles.focusProgressTrack}>
            <View
              style={[
                styles.focusProgressFill,
                { width: `${Math.max(0, Math.min(100, focusSessionProgressPct))}%` },
              ]}
            />
          </View>
          <View style={styles.focusControlsRow}>
            <TextInput
              value={focusInputValue}
              keyboardType="number-pad"
              onChangeText={setFocusInputValue}
              onBlur={() => applyFocusDuration(focusInputValue)}
              style={styles.focusInput}
              placeholder="25"
              placeholderTextColor={COLORS.textSubtle}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.focusSecondaryButton}
              onPress={() => applyFocusDuration(focusInputValue)}
            >
              <Text style={styles.focusSecondaryButtonText}>Set Min</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.focusPrimaryButton}
              onPress={toggleFocusTimer}
            >
              <Text style={styles.focusPrimaryButtonText}>
                {focusIsRunning ? "Pause" : "Start"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.focusSecondaryButton}
              onPress={resetFocusTimer}
            >
              <Text style={styles.focusSecondaryButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View
          style={[
            styles.weeklySummaryCard,
            isCompact ? styles.weeklySummaryCardCompact : null,
            {
              opacity: weeklySummaryOpacity,
              transform: [{ translateY: weeklySummaryTranslateY }],
            },
          ]}
        >
          <Text style={styles.weeklySummaryTitle}>Weekly Review Snapshot</Text>
          {history30.length === 0 ? (
            <View style={styles.emptyStateCompact}>
              <Text style={styles.emptyStateTitle}>No weekly snapshot yet</Text>
              <Text style={styles.emptyStateBody}>
                Start logging progress to generate your first weekly review summary.
              </Text>
            </View>
          ) : (
            <Text style={styles.weeklySummaryBody}>
              Consistency {consistency30}%, completion {completionPct}%, current streak {streakDays} day
              {streakDays === 1 ? "" : "s"}.
            </Text>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.weeklySummaryButton}
            onPress={() => router.push("/weekly-review" as any)}
          >
            <Text style={styles.weeklySummaryButtonText}>Open Weekly Review</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={[styles.weeklySummaryCard, isCompact ? styles.weeklySummaryCardCompact : null]}>
          <Text style={styles.weeklySummaryTitle}>Monthly Milestone</Text>
          {monthlySummary.hasData ? (
            <View style={styles.monthlyStatsGrid}>
              <View style={styles.monthlyStatItem}>
                <Text style={styles.kpiLabel}>Best area this month</Text>
                <Text style={styles.kpiValue}>{monthlySummary.bestArea}</Text>
              </View>
              <View style={styles.monthlyStatItem}>
                <Text style={styles.kpiLabel}>Improvement since month start</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    monthlySummary.improvementPct >= 0 ? styles.improvementUp : styles.improvementDown,
                  ]}
                >
                  {monthlySummary.improvementPct >= 0 ? "+" : ""}
                  {monthlySummary.improvementPct}%
                </Text>
              </View>
              <View style={styles.monthlyStatItem}>
                <Text style={styles.kpiLabel}>Total habits completed</Text>
                <Text style={styles.kpiValue}>{habitsCompletedThisMonth}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyStateCompact}>
              <Text style={styles.emptyStateTitle}>No monthly summary yet</Text>
              <Text style={styles.emptyStateBody}>
                Log updates and complete habits this month to unlock milestone insights.
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.weeklySummaryCard, isCompact ? styles.weeklySummaryCardCompact : null]}>
          <Text style={styles.weeklySummaryTitle}>Smart Coaching</Text>
          <View style={styles.coachingPresetRow}>
            {COACHING_PRESET_OPTIONS.map((option) => {
              const isActive = option.key === coachingPreset;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.8}
                  style={[
                    styles.coachingPresetButton,
                    isActive ? styles.coachingPresetButtonActive : null,
                  ]}
                  onPress={() => setCoachingPreset(option.key)}
                >
                  <Text
                    style={[
                      styles.coachingPresetButtonText,
                      isActive ? styles.coachingPresetButtonTextActive : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {coachingInsights.length === 0 && adaptiveTargetSuggestions.length === 0 ? (
            <View style={isCompact ? styles.emptyStateCompact : styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No critical adjustments right now</Text>
              <Text style={styles.emptyStateBody}>
                Keep logging updates to unlock cross-area and target coaching signals.
              </Text>
            </View>
          ) : (
            <View style={styles.coachingList}>
              {coachingInsights.map((insight) => (
                <View key={insight} style={styles.coachingItem}>
                  <Text style={styles.coachingItemTitle}>Cross-Area Intelligence</Text>
                  <Text style={styles.coachingItemBody}>{insight}</Text>
                </View>
              ))}
              {adaptiveTargetSuggestions.map((suggestion) => (
                <View key={suggestion} style={styles.coachingItem}>
                  <Text style={styles.coachingItemTitle}>Adaptive Target Suggestion</Text>
                  <Text style={styles.coachingItemBody}>{suggestion}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.grid,
          {
            opacity: cardsOpacity,
            transform: [{ translateY: cardsTranslateY }],
          },
        ]}
      >
        <Text style={styles.blockHeading}>Area scorecards</Text>
        {cards.map((card) => {
          const trend = getTrend(card.score, card.previousScore);

          return (
            <Link key={card.title} href={card.href} asChild>
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.cardShell}
                onPressIn={() => animatePress(getCardPressAnim(card.title), 0.985)}
                onPressOut={() => animatePress(getCardPressAnim(card.title), 1)}
              >
                <Animated.View
                  style={[styles.card, { transform: [{ scale: getCardPressAnim(card.title) }] }]}
                >
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.cardScore}>{card.score}/100</Text>
                    <Text style={[styles.trendText, { color: trend.color }]}>
                      {trend.label}
                    </Text>
                  </View>
                  <Text style={styles.cardTarget}>Target: {card.target}</Text>
                  <Text style={styles.cardUpdated}>
                    Last updated: {formatUpdatedAt(card.updatedAt)}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            </Link>
          );
        })}
      </Animated.View>

      <Animated.View
        style={{
          opacity: extrasOpacity,
          transform: [{ translateY: extrasTranslateY }],
        }}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Advanced Analytics</Text>
          <Text style={styles.sectionMeta}>Tap to open Analytics</Text>
          <View style={styles.analyticsPreviewCards}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.previewCard}
              onPress={() => router.push("/analytics" as any)}
            >
              <Text style={styles.previewTitle}>Trends over time</Text>
              <Text style={styles.previewBody}>30-entry overall trend available now.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.previewCard}
              onPress={() => router.push("/analytics" as any)}
            >
              <Text style={styles.previewTitle}>Consistency score</Text>
              <Text style={styles.previewBody}>{consistency30}% over last 30 entries.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.previewCard}
              onPress={() => router.push("/analytics" as any)}
            >
              <Text style={styles.previewTitle}>Best / Worst area this month</Text>
              <Text style={styles.previewBody}>
                Best: {monthAreaSummary.best} | Worst: {monthAreaSummary.worst}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Performance Analytics</Text>
          <View style={styles.analyticsBody}>
            {overallData.length > 0 ? (
              <PerformanceGraph
                data={overallData}
                label="Overall Trend"
                width={Math.max(220, width - (isCompact ? SPACING.xl * 2 : SPACING.xxl * 3))}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No performance history yet</Text>
                <Text style={styles.emptyStateBody}>
                  Start logging progress to unlock analytics.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.emptyStateButton}
                  onPress={() => router.push("/revision" as any)}
                >
                  <Text style={styles.emptyStateButtonText}>Log first update</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Achievement Badges</Text>
            <Text style={styles.sectionMeta}>
              {unlockedBadgesCount}/{badges.length} unlocked
            </Text>
          </View>
          {unlockedBadgesCount === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>First badge is close</Text>
              <Text style={styles.emptyStateBody}>
                Reach an average score of 25 to unlock your starter momentum badge.
              </Text>
            </View>
          ) : null}
          <Text style={styles.habitSummary}>
            Focus minutes: {focusMinutesLifetime} | Perfect weeks: {perfectWeeksCount} | Current level:{" "}
            {currentLevelTier.level} | 30d consistency streak: {consistencyStreak30}
          </Text>
          <View style={styles.badgeGrid}>
            {badges.map((badge) => (
              <Animated.View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
                  { transform: [{ scale: getBadgeBounceAnim(badge.id) }] },
                ]}
              >
                <Text style={[styles.badgeTitle, badge.unlocked ? styles.badgeTitleUnlocked : null]}>
                  {badge.label}
                </Text>
                <Text style={styles.badgeDetail}>{badge.detail}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Daily reminder</Text>
            <Switch value={prefs.dailyEnabled} onValueChange={setDailyEnabled} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Weekly review reminder</Text>
            <Switch value={prefs.weeklyEnabled} onValueChange={setWeeklyEnabled} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Daily Habits</Text>
            <Text style={styles.sectionMeta}>
              {doneCount}/{activeHabits.length} today
            </Text>
          </View>
          <Text style={styles.habitSummary}>
            Completion {completionPct}% - Current streak {streakDays} day
            {streakDays === 1 ? "" : "s"}
          </Text>
          <Text style={styles.habitSummary}>
            Weighted completion (difficulty-adjusted): {weightedCompletionPct}%
          </Text>

          {activeHabits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No habits yet</Text>
              <Text style={styles.emptyStateBody}>
                Add your first habit to build momentum.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.emptyStateButton}
                onPress={() => router.push("/habits" as any)}
              >
                <Text style={styles.emptyStateButtonText}>Create habits</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.habitList}>
              {activeHabits.map((habit) => {
                const checked = !!todayMap[habit.id];
                const habitStreak = habitStreakById[habit.id] ?? 0;
                return (
                  <TouchableOpacity
                    key={habit.id}
                    activeOpacity={0.92}
                    style={styles.habitItemShell}
                    onPressIn={() => animatePress(getHabitPressAnim(habit.id), 0.985)}
                    onPressOut={() => animatePress(getHabitPressAnim(habit.id), 1)}
                    onPress={() => {
                      if (!checked) {
                        animateHabitTick(habit.id);
                        if (activeHabits.length > 0 && doneCount + 1 === activeHabits.length) {
                          celebrateAllHabitsComplete();
                        }
                      }
                      toggleHabit(habit.id);
                    }}
                  >
                    <Animated.View
                      style={[
                        styles.habitItem,
                        checked ? styles.habitChecked : null,
                        { transform: [{ scale: getHabitPressAnim(habit.id) }] },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.habitCheck,
                          checked ? styles.habitCheckActive : null,
                          { transform: [{ scale: getHabitCheckPopAnim(habit.id) }] },
                        ]}
                      >
                        {checked ? <Text style={styles.habitCheckMark}>v</Text> : null}
                      </Animated.View>
                      <View style={styles.habitTextBlock}>
                        <Text style={styles.habitLabel}>{habit.title}</Text>
                        <Text style={styles.habitStreakText}>
                          {"\uD83D\uDD25"} {habitStreak}d streak
                        </Text>
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.weekResetButton}
            onPress={() =>
              Alert.alert("Start Fresh Week?", "This clears habit check-offs for the current week only.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Start Fresh",
                  style: "destructive",
                  onPress: () => {
                    resetCurrentWeekHabits().catch(() => {
                      Alert.alert("Could not reset week", "Please try again.");
                    });
                  },
                },
              ])
            }
          >
            <Text style={styles.weekResetButtonText}>Start Fresh Week</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Settings & Info</Text>
          <Text style={styles.infoText}>Last updated: {POLICY_LAST_UPDATED}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.linkButton}
            onPress={() => router.push("/privacy" as any)}
          >
            <Text style={styles.linkButtonText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.linkButton}
            onPress={() => router.push("/disclaimer" as any)}
          >
            <Text style={styles.linkButtonText}>Open Terms of Use URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.linkButton}
            onPress={() => {
              openPrivacyPolicyUrl().catch(() => {
                Alert.alert("Could not open link", "Please try again.");
              });
            }}
          >
            <Text style={styles.linkButtonText}>Open Privacy Policy URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.linkButton}
            onPress={() => {
              Linking.openURL(TERMS_OF_USE_URL).catch(() => {
                Alert.alert("Could not open link", "Please try again.");
              });
            }}
          >
            <Text style={styles.linkButtonText}>Open Terms of Use URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.linkButton}
            onPress={() => {
              handleExportBackup().catch(() => {});
            }}
          >
            <Text style={styles.linkButtonText}>Export backup (JSON)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.linkButton}
            onPress={confirmRestoreBackup}
          >
            <Text style={styles.linkButtonText}>Restore backup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.resetButton}
            onPress={confirmResetLocalData}
          >
            <Text style={styles.resetButtonText}>Reset local data</Text>
          </TouchableOpacity>
          <Text style={styles.infoText}>Backups include local app data only.</Text>
          <Text style={styles.infoText}>
            Privacy: All data stored locally on your device. No accounts. No servers.
          </Text>
          <Text style={styles.infoText}>
            Terms: Personal planning tool only. Not medical/financial advice.
          </Text>
          <Text style={styles.infoText}>
            All features are free to use. There is no premium tier and no payment flow in this build.
          </Text>
        </View>
      </Animated.View>

      <Link href="/targets" asChild>
        <TouchableOpacity activeOpacity={0.8} style={styles.button}>
          <Text style={styles.buttonText}>Edit Targets</Text>
        </TouchableOpacity>
      </Link>

      <Link href={"/habits" as any} asChild>
        <TouchableOpacity activeOpacity={0.8} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Manage Habits</Text>
        </TouchableOpacity>
      </Link>

      <Link href={"/weekly-review" as any} asChild>
        <TouchableOpacity activeOpacity={0.8} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Weekly Review</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) => StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    backgroundColor: COLORS.backgroundAlt,
    flexGrow: 1,
  },
  containerCompact: {
    padding: SPACING.lg,
  },
  toastContainer: {
    alignSelf: "center",
    backgroundColor: COLORS.textPrimary,
    borderRadius: RADIUS.button,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  toastText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 12,
  },
  habitCelebrateBanner: {
    alignSelf: "center",
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.success,
    borderWidth: 1,
    borderRadius: RADIUS.button,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  habitCelebrateText: {
    color: COLORS.success,
    fontWeight: "700",
    fontSize: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: COLORS.textPrimary,
  },
  titleCompact: {
    fontSize: 28,
  },
  welcomeText: {
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroCardCompact: {
    padding: SPACING.lg,
  },
  heroEyebrow: {
    alignSelf: "flex-start",
    marginBottom: SPACING.md,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.md,
  },
  scoreRingWrap: {
    width: 126,
    height: 126,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingChart: {
    borderRadius: 999,
  },
  scoreRingCenter: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreRingValue: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 22,
    lineHeight: 24,
  },
  scoreRingLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  progressTrack: {
    marginTop: SPACING.md,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    fontSize: 12,
  },
  positiveDeltaText: {
    marginTop: SPACING.xs,
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  momentumBanner: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  momentumBannerPositive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successSoft,
  },
  momentumBannerText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  heroSnapshotRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  heroSnapshotCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  heroSnapshotLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroSnapshotValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  kpiRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  kpiRowCompact: {
    gap: SPACING.xs,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
  },
  kpiLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  kpiValue: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  topActionsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  topActionsRowCompact: {
    flexDirection: "column",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  topActionButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topActionButtonCompact: {
    width: "100%",
  },
  topActionText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 18,
    marginTop: 2,
  },
  topActionKicker: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  topActionSubtext: {
    marginTop: SPACING.xs,
    color: COLORS.textMuted,
    lineHeight: 18,
    fontSize: 12,
  },
  weeklySummaryCard: {
    marginBottom: SPACING.xxl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    shadowColor: COLORS.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  weeklySummaryCardCompact: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  weeklySummaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  weeklySummaryBody: {
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  coachingPresetRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  coachingPresetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  coachingPresetButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  coachingPresetButtonText: {
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 12,
  },
  coachingPresetButtonTextActive: {
    color: COLORS.primary,
  },
  coachingList: {
    gap: SPACING.sm,
  },
  coachingItem: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  coachingItemTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coachingItemBody: {
    color: COLORS.textSecondary,
    lineHeight: 19,
    fontSize: 13,
  },
  weeklySummaryButton: {
    marginTop: SPACING.md,
    alignSelf: "flex-start",
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  weeklySummaryButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  focusTimerClock: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 30,
    letterSpacing: 1,
  },
  focusProgressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  focusProgressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  focusControlsRow: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  focusInput: {
    minWidth: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontWeight: "700",
  },
  focusPrimaryButton: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  focusPrimaryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  focusSecondaryButton: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  focusSecondaryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  monthlyStatsGrid: {
    gap: SPACING.sm,
  },
  monthlyStatItem: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
  },
  improvementUp: {
    color: COLORS.success,
  },
  improvementDown: {
    color: COLORS.danger,
  },
  grid: {
    gap: SPACING.lg,
  },
  blockHeading: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xxlPlus,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardShell: {
    borderRadius: RADIUS.card,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scoreRow: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  cardScore: {
    fontSize: 26,
    fontWeight: "700",
  },
  trendText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardTarget: {
    marginTop: SPACING.xs,
    color: COLORS.textMuted,
  },
  cardUpdated: {
    marginTop: SPACING.xs,
    color: COLORS.textSubtle,
    fontSize: 12,
  },
  sectionCard: {
    marginTop: SPACING.xxl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  analyticsBody: {
    marginTop: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  badgeGrid: {
    gap: SPACING.sm,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyStateCompact: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
  },
  emptyStateTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  emptyStateBody: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyStateButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  emptyStateButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  analyticsPreviewCards: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  previewCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.xs,
    minHeight: 72,
    justifyContent: "center",
  },
  previewTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  previewBody: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  badgeCard: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  badgeUnlocked: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successSoft,
  },
  badgeLocked: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  badgeTitle: {
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  badgeTitleUnlocked: {
    color: COLORS.success,
  },
  badgeDetail: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  habitSummary: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  habitList: {
    gap: SPACING.sm,
  },
  weekResetButton: {
    marginTop: SPACING.md,
    alignSelf: "flex-start",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  weekResetButtonText: {
    color: COLORS.danger,
    fontWeight: "700",
  },
  toggleRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  toggleLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  habitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  habitItemShell: {
    borderRadius: RADIUS.card,
  },
  habitChecked: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successSoft,
  },
  habitCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.textSubtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  habitCheckActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success,
  },
  habitCheckMark: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  habitLabel: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  habitTextBlock: {
    flex: 1,
  },
  habitStreakText: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  infoText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  linkButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  linkButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  resetButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
  },
  resetButtonText: {
    color: COLORS.danger,
    fontWeight: "700",
  },
  button: {
    marginTop: SPACING.xxl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.input,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: SPACING.input,
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
