import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getJSON, setJSON } from "../src/utils/storage";
import {
  calculateHabitStreak,
  getLocalDateKey,
  toggleHabitCompletion,
} from "../src/utils/habitLogic.js";

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

export const HabitProvider = ({ children }: { children: React.ReactNode }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletion, setHabitCompletion] = useState<HabitCompletion>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const habitsRef = useRef<Habit[]>([]);
  const habitCompletionRef = useRef<HabitCompletion>({});

  const rehydrateHabitsData = useCallback(async () => {
    setIsHydrated(false);
    try {
      const storedHabits = await getJSON<Habit[] | null>(HABITS_STORAGE_KEY, null);
      if (storedHabits && Array.isArray(storedHabits)) {
        const normalized = storedHabits.map((habit) => normalizeHabit(habit));
        habitsRef.current = normalized;
        setHabits(normalized);
        await setJSON(HABITS_STORAGE_KEY, normalized);
      } else {
        habitsRef.current = defaultHabits;
        setHabits(defaultHabits);
        await setJSON(HABITS_STORAGE_KEY, defaultHabits);
      }

      const parsed = await getJSON<HabitCompletion | unknown[] | null>(
        HABIT_COMPLETION_STORAGE_KEY,
        null
      );
      if (!parsed) {
        habitCompletionRef.current = {};
        habitCompletionRef.current = {};
        setHabitCompletion({});
        await setJSON(HABIT_COMPLETION_STORAGE_KEY, {});
      } else if (Array.isArray(parsed)) {
        setHabitCompletion({});
        await setJSON(HABIT_COMPLETION_STORAGE_KEY, {});
      } else {
        habitCompletionRef.current = parsed as HabitCompletion;
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
    const next = toggleHabitCompletion(habitCompletionRef.current, today, habitId) as HabitCompletion;
    habitCompletionRef.current = next;
    setHabitCompletion(next);
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

    const updated = [...habitsRef.current, newHabit];
    habitsRef.current = updated;
    setHabits(updated);
    await setJSON(HABITS_STORAGE_KEY, updated);
  };

  const updateHabit = async (id: string, patch: Partial<Habit>) => {
    const updated = habitsRef.current.map((habit) =>
      habit.id === id ? normalizeHabit({ ...habit, ...patch }) : habit
    );
    habitsRef.current = updated;
    setHabits(updated);
    await setJSON(HABITS_STORAGE_KEY, updated);
  };

  const removeHabit = async (id: string) => {
    const updated = habitsRef.current.map((habit) =>
      habit.id === id ? { ...habit, active: false } : habit
    );
    habitsRef.current = updated;
    setHabits(updated);
    await setJSON(HABITS_STORAGE_KEY, updated);
  };

  const resetCurrentWeekHabits = useCallback(async () => {
    const weekStartKey = getLocalDateKey(getStartOfCurrentWeek());
    const todayKey = getLocalDateKey(new Date());
    const next: HabitCompletion = { ...(habitCompletionRef.current || {}) };

    Object.keys(next).forEach((dateKey) => {
      if (dateKey >= weekStartKey && dateKey <= todayKey) {
        delete next[dateKey];
      }
    });

    habitCompletionRef.current = next;
    setHabitCompletion(next);
    await setJSON(HABIT_COMPLETION_STORAGE_KEY, next);
  }, []);

  const resetHabitsData = useCallback(async () => {
    habitsRef.current = defaultHabits;
    habitCompletionRef.current = {};
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
    const streakDays = calculateHabitStreak(habits, habitCompletion, new Date());

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
