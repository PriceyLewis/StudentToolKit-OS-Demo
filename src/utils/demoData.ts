import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_DATA_KEYS } from "./resetAppData";

const DEMO_ACTIVE_KEY = "__studentToolkitPortfolioDemoActive";
const DEMO_SNAPSHOT_KEY = "__studentToolkitPortfolioDemoSnapshot";

type StoredSnapshot = Record<string, string | null>;

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const relativeDateKey = (offsetDays: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return toLocalDateKey(date);
};

const createPerformanceHistory = () => {
  const checkpoints = [-28, -24, -20, -16, -12, -8, -4, 0];
  return checkpoints.map((offset, index) => ({
    date: relativeDateKey(offset),
    academic: 52 + index * 3,
    fitness: 55 + index * 2,
    hustle: 38 + index * 3,
    career: 58 + index * 2,
  }));
};

const habits = [
  {
    id: "demo-study",
    title: "Focused revision",
    category: "academic",
    difficulty: "hard",
    active: true,
  },
  {
    id: "demo-train",
    title: "Train or hit 8k steps",
    category: "fitness",
    difficulty: "medium",
    active: true,
  },
  {
    id: "demo-build",
    title: "Build portfolio project",
    category: "hustle",
    difficulty: "hard",
    active: true,
  },
  {
    id: "demo-career",
    title: "Career action",
    category: "career",
    difficulty: "medium",
    active: true,
  },
] as const;

const createHabitCompletion = () => {
  const completion: Record<string, Record<string, boolean>> = {};

  for (let offset = -13; offset <= 0; offset += 1) {
    const dayIndex = offset + 13;
    completion[relativeDateKey(offset)] = {
      "demo-study": dayIndex % 5 !== 1,
      "demo-train": dayIndex % 4 !== 1,
      "demo-build": dayIndex % 3 !== 0,
      "demo-career": dayIndex % 6 !== 2,
    };
  }

  completion[relativeDateKey(0)] = {
    "demo-study": true,
    "demo-train": true,
    "demo-build": false,
    "demo-career": true,
  };

  return completion;
};

const createDemoEntries = (): [string, string][] => {
  const now = new Date().toISOString();
  const performanceHistory = createPerformanceHistory();

  const data: Record<string, unknown> = {
    profileData: {
      name: "Alex",
      primaryFocus: "Exam preparation + graduate career",
      onboardingComplete: true,
    },
    performanceState: {
      academicScore: 73,
      fitnessScore: 69,
      hustleScore: 59,
      careerScore: 76,
      prevAcademicScore: 67,
      prevFitnessScore: 65,
      prevHustleScore: 51,
      prevCareerScore: 72,
      academicUpdatedAt: now,
      fitnessUpdatedAt: now,
      hustleUpdatedAt: now,
      careerUpdatedAt: now,
      academicTarget: 12,
      fitnessTarget: 4,
      hustleTarget: 6,
      careerTarget: 85,
      academicDeadline: relativeDateKey(35),
      fitnessDeadline: relativeDateKey(28),
      hustleDeadline: relativeDateKey(45),
      careerDeadline: relativeDateKey(21),
    },
    performanceHistory,
    habits,
    habitCompletion: createHabitCompletion(),
    revisionFormState: {
      subjects: "Algorithms, Databases, Cloud Computing",
      hours: "12",
      examDate: relativeDateKey(35),
      availabilityDays: "5",
      intensity: "balanced",
      confidenceBySubject: {
        Algorithms: "medium",
        Databases: "high",
        "Cloud Computing": "low",
      },
    },
    focusTimerState: {
      selectedMinutes: 25,
      remainingSeconds: 1500,
      completedSessions: 18,
      sessionHistory: [
        { date: relativeDateKey(-6), minutes: 25 },
        { date: relativeDateKey(-5), minutes: 50 },
        { date: relativeDateKey(-4), minutes: 25 },
        { date: relativeDateKey(-2), minutes: 50 },
        { date: relativeDateKey(-1), minutes: 25 },
      ],
    },
    dashboardThemePreset: "clean",
  };

  return Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]);
};

const writeDemoData = async () => {
  await AsyncStorage.multiSet(createDemoEntries());
  await AsyncStorage.setItem(DEMO_ACTIVE_KEY, "1");
};

export async function isPortfolioDemoActive() {
  return (await AsyncStorage.getItem(DEMO_ACTIVE_KEY)) === "1";
}

export async function seedPortfolioDemo() {
  const active = await isPortfolioDemoActive();

  if (!active) {
    const existing = await AsyncStorage.multiGet([...APP_DATA_KEYS] as string[]);
    const snapshot: StoredSnapshot = Object.fromEntries(existing);
    await AsyncStorage.setItem(DEMO_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  await writeDemoData();
}

export async function resetPortfolioDemo() {
  await writeDemoData();
}

export async function exitPortfolioDemo() {
  const rawSnapshot = await AsyncStorage.getItem(DEMO_SNAPSHOT_KEY);
  let snapshot: StoredSnapshot = {};

  if (rawSnapshot) {
    try {
      const parsed = JSON.parse(rawSnapshot) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        snapshot = parsed as StoredSnapshot;
      }
    } catch {
      snapshot = {};
    }
  }

  const keys = [...APP_DATA_KEYS] as string[];
  await AsyncStorage.multiRemove(keys);

  const valuesToRestore = Object.entries(snapshot).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  if (valuesToRestore.length > 0) {
    await AsyncStorage.multiSet(valuesToRestore);
  }

  await AsyncStorage.multiRemove([DEMO_ACTIVE_KEY, DEMO_SNAPSHOT_KEY]);
}
