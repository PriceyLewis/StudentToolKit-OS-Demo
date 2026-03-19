import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getJSON, setJSON } from "../src/utils/storage";

export type HabitCategory = "academic" | "fitness" | "hustle" | "career";
export type HabitDifficulty = "easy" | "medium" | "hard";

export type Habit = {
  id: string;
  title: string;
  category: HabitCategory;
  difficulty: HabitDifficulty;
  active: boolean;
};

export type HabitCompletion = {
  [date: string]: { [habitId: string]: boolean };
};

const HABITS_STORAGE_KEY = "habits";
const HABIT_COMPLETION_STORAGE_KEY = "habitCompletion";

export const defaultHabits: Habit[] = [
  { id: "h1", title: "Study / Revision", category: "academic", difficulty: "hard", active: true },
  { id: "h2", title: "Workout", category: "fitness", difficulty: "medium", active: true },
  { id: "h3", title: "Income action", category: "hustle", difficulty: "medium", active: true },
  { id: "h4", title: "Career step", category: "career", difficulty: "easy", active: true },
];

type HabitContextType = {
  habits: Habit[];
  activeHabits: Habit[];
  habitCompletion: HabitCompletion;
  isHydrated: boolean;
  todayKey: string;
  todayMap: Record<string, boolean>;
  doneCount: number;
  completionPct: number;
  weightedCompletionPct: number;
  streakDays: number;
  toggleHabit: (habitId: string) => Promise<void>;
  addHabit: () => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  resetCurrentWeekHabits: () => Promise<void>;
  resetHabitsData: () => Promise<void>;
  rehydrateHabitsData: () => Promise<void>;
};

const HabitContext = createContext<HabitContextType>({
  habits: [],
  activeHabits: [],
  habitCompletion: {},
  isHydrated: false,
  todayKey: "",
  todayMap: {},
  doneCount: 0,
  completionPct: 0,
  weightedCompletionPct: 0,
  streakDays: 0,
  toggleHabit: async () => {},
  addHabit: async () => {},
  updateHabit: async () => {},
  removeHabit: async () => {},
  resetCurrentWeekHabits: async () => {},
  resetHabitsData: async () => {},
  rehydrateHabitsData: async () => {},
});

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const makeId = () => Math.random().toString(36).slice(2, 10);

const difficultyWeight: Record<HabitDifficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

const normalizeHabit = (habit: Partial<Habit>): Habit => ({
  id: typeof habit.id === "string" && habit.id ? habit.id : makeId(),
  title: typeof habit.title === "string" ? habit.title : "New habit",
  category:
    habit.category === "academic" ||
    habit.category === "fitness" ||
    habit.category === "hustle" ||
    habit.category === "career"
      ? habit.category
      : "academic",
  difficulty:
    habit.difficulty === "easy" || habit.difficulty === "medium" || habit.difficulty === "hard"
      ? habit.difficulty
      : "medium",
  active: typeof habit.active === "boolean" ? habit.active : true,
});

const getStartOfCurrentWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const deltaToMonday = day === 0 ? 6 : day - 1;
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - deltaToMonday);
  return now;
};

const calculateStreak = (habits: Habit[], completion: HabitCompletion, fromDate: Date) => {
  const activeHabits = habits.filter((habit) => habit.active);
  if (activeHabits.length === 0) {
    return 0;
  }

  let streak = 0;
  const cursor = new Date(fromDate);

  for (let i = 0; i < 365; i += 1) {
    const key = getLocalDateKey(cursor);
    const day = completion[key] ?? {};
    const allDone = activeHabits.every((habit) => !!day[habit.id]);

    if (!allDone) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export const HabitProvider = ({ children }: { children: React.ReactNode }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletion, setHabitCompletion] = useState<HabitCompletion>({});
  const [isHydrated, setIsHydrated] = useState(false);

  const rehydrateHabitsData = useCallback(async () => {
    setIsHydrated(false);
    try {
      const storedHabits = await getJSON<Habit[] | null>(HABITS_STORAGE_KEY, null);
      if (storedHabits && Array.isArray(storedHabits)) {
        const normalized = storedHabits.map((habit) => normalizeHabit(habit));
        setHabits(normalized);
        await setJSON(HABITS_STORAGE_KEY, normalized);
      } else {
        setHabits(defaultHabits);
        await setJSON(HABITS_STORAGE_KEY, defaultHabits);
      }

      const parsed = await getJSON<HabitCompletion | unknown[] | null>(
        HABIT_COMPLETION_STORAGE_KEY,
        null
      );
      if (!parsed) {
        setHabitCompletion({});
        await setJSON(HABIT_COMPLETION_STORAGE_KEY, {});
      } else if (Array.isArray(parsed)) {
        setHabitCompletion({});
        await setJSON(HABIT_COMPLETION_STORAGE_KEY, {});
      } else {
        setHabitCompletion(parsed as HabitCompletion);
      }
    } catch (error) {
      console.error("Failed to load habits", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    rehydrateHabitsData();
  }, [rehydrateHabitsData]);

  const toggleHabit = async (habitId: string) => {
    const today = getLocalDateKey(new Date());
    let next: HabitCompletion = {};
    setHabitCompletion((current) => {
      const snapshot = { ...(current || {}) };
      const day = { ...(snapshot[today] || {}) };
      day[habitId] = !day[habitId];
      snapshot[today] = day;
      next = snapshot;
      return snapshot;
    });
    await setJSON(HABIT_COMPLETION_STORAGE_KEY, next);
  };

  const addHabit = async () => {
    const newHabit: Habit = {
      id: makeId(),
      title: "New habit",
      category: "academic",
      difficulty: "medium",
      active: true,
    };

    let updated: Habit[] = [];
    setHabits((current) => {
      updated = [...current, newHabit];
      return updated;
    });
    await setJSON(HABITS_STORAGE_KEY, updated);
  };

  const updateHabit = async (id: string, patch: Partial<Habit>) => {
    let updated: Habit[] = [];
    setHabits((current) => {
      updated = current.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit));
      return updated;
    });
    await setJSON(HABITS_STORAGE_KEY, updated);
  };

  const removeHabit = async (id: string) => {
    let updated: Habit[] = [];
    setHabits((current) => {
      updated = current.map((habit) =>
        habit.id === id ? { ...habit, active: false } : habit
      );
      return updated;
    });
    await setJSON(HABITS_STORAGE_KEY, updated);
  };

  const resetCurrentWeekHabits = useCallback(async () => {
    const weekStartKey = getLocalDateKey(getStartOfCurrentWeek());
    const todayKey = getLocalDateKey(new Date());
    let next: HabitCompletion = {};

    setHabitCompletion((current) => {
      const snapshot = { ...(current || {}) };
      Object.keys(snapshot).forEach((dateKey) => {
        if (dateKey >= weekStartKey && dateKey <= todayKey) {
          delete snapshot[dateKey];
        }
      });
      next = snapshot;
      return snapshot;
    });

    await setJSON(HABIT_COMPLETION_STORAGE_KEY, next);
  }, []);

  const resetHabitsData = useCallback(async () => {
    setHabits(defaultHabits);
    setHabitCompletion({});
    await setJSON(HABITS_STORAGE_KEY, defaultHabits);
    await setJSON(HABIT_COMPLETION_STORAGE_KEY, {});
  }, []);

  const value = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    const activeHabits = habits.filter((habit) => habit.active);
    const todayMap = habitCompletion[todayKey] || {};
    const doneCount = activeHabits.filter((habit) => todayMap[habit.id]).length;
    const completionPct = activeHabits.length
      ? Math.round((doneCount / activeHabits.length) * 100)
      : 0;
    const weightedTotal = activeHabits.reduce(
      (sum, habit) => sum + difficultyWeight[habit.difficulty],
      0
    );
    const weightedDone = activeHabits.reduce(
      (sum, habit) => sum + (todayMap[habit.id] ? difficultyWeight[habit.difficulty] : 0),
      0
    );
    const weightedCompletionPct = weightedTotal ? Math.round((weightedDone / weightedTotal) * 100) : 0;
    const streakDays = calculateStreak(habits, habitCompletion, new Date());

    return {
      habits,
      activeHabits,
      habitCompletion,
      isHydrated,
      todayKey,
      todayMap,
      doneCount,
      completionPct,
      weightedCompletionPct,
      streakDays,
      toggleHabit,
      addHabit,
      updateHabit,
      removeHabit,
      resetCurrentWeekHabits,
      resetHabitsData,
      rehydrateHabitsData,
    };
  }, [habits, habitCompletion, isHydrated, resetCurrentWeekHabits, resetHabitsData, rehydrateHabitsData]);

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
};

export const useHabits = () => useContext(HabitContext);
