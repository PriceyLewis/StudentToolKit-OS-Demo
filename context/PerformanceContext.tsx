import React, { createContext, useCallback, useEffect, useState } from "react";
import type { HistoryEntry } from "../src/utils/review";
import { getJSON, setJSON } from "../src/utils/storage";

const PERFORMANCE_STORAGE_KEY = "performanceState";


const DEFAULT_PERFORMANCE_STATE = {
  academicScore: 0,
  fitnessScore: 0,
  hustleScore: 0,
  careerScore: 0,
  prevAcademicScore: 0,
  prevFitnessScore: 0,
  prevHustleScore: 0,
  prevCareerScore: 0,
  academicUpdatedAt: "",
  fitnessUpdatedAt: "",
  hustleUpdatedAt: "",
  careerUpdatedAt: "",
  academicTarget: 10,
  fitnessTarget: 3,
  hustleTarget: 5,
  careerTarget: 80,
  academicDeadline: "",
  fitnessDeadline: "",
  hustleDeadline: "",
  careerDeadline: "",
};

type PersistedPerformanceState = typeof DEFAULT_PERFORMANCE_STATE;

type PerformanceContextType = {
  academicScore: number;
  fitnessScore: number;
  hustleScore: number;
  careerScore: number;
  performanceHistory: HistoryEntry[];

  academicTarget: number;
  fitnessTarget: number;
  hustleTarget: number;
  careerTarget: number;
  academicDeadline: string;
  fitnessDeadline: string;
  hustleDeadline: string;
  careerDeadline: string;

  prevAcademicScore: number;
  prevFitnessScore: number;
  prevHustleScore: number;
  prevCareerScore: number;
  academicUpdatedAt: string;
  fitnessUpdatedAt: string;
  hustleUpdatedAt: string;
  careerUpdatedAt: string;

  setAcademicScore: (score: number) => void;
  setFitnessScore: (score: number) => void;
  setHustleScore: (score: number) => void;
  setCareerScore: (score: number) => void;

  setAcademicTarget: (value: number) => void;
  setFitnessTarget: (value: number) => void;
  setHustleTarget: (value: number) => void;
  setCareerTarget: (value: number) => void;
  setAcademicDeadline: (value: string) => void;
  setFitnessDeadline: (value: string) => void;
  setHustleDeadline: (value: string) => void;
  setCareerDeadline: (value: string) => void;
  savePerformanceHistory: (history: HistoryEntry[]) => Promise<void>;
  resetPerformanceData: () => Promise<void>;
  rehydratePerformanceData: () => Promise<void>;
};

export const PerformanceContext = createContext<PerformanceContextType>({
  ...DEFAULT_PERFORMANCE_STATE,
  performanceHistory: [],
  prevAcademicScore: 0,
  prevFitnessScore: 0,
  prevHustleScore: 0,
  prevCareerScore: 0,
  academicUpdatedAt: "",
  fitnessUpdatedAt: "",
  hustleUpdatedAt: "",
  careerUpdatedAt: "",
  setAcademicScore: () => {},
  setFitnessScore: () => {},
  setHustleScore: () => {},
  setCareerScore: () => {},
  setAcademicTarget: () => {},
  setFitnessTarget: () => {},
  setHustleTarget: () => {},
  setCareerTarget: () => {},
  setAcademicDeadline: () => {},
  setFitnessDeadline: () => {},
  setHustleDeadline: () => {},
  setCareerDeadline: () => {},
  savePerformanceHistory: async () => {},
  resetPerformanceData: async () => {},
  rehydratePerformanceData: async () => {},
});

export const PerformanceProvider = ({ children }: any) => {
  const [academicScore, setAcademicScoreState] = useState(DEFAULT_PERFORMANCE_STATE.academicScore);
  const [fitnessScore, setFitnessScoreState] = useState(DEFAULT_PERFORMANCE_STATE.fitnessScore);
  const [hustleScore, setHustleScoreState] = useState(DEFAULT_PERFORMANCE_STATE.hustleScore);
  const [careerScore, setCareerScoreState] = useState(DEFAULT_PERFORMANCE_STATE.careerScore);

  const [academicTarget, setAcademicTarget] = useState(DEFAULT_PERFORMANCE_STATE.academicTarget);
  const [fitnessTarget, setFitnessTarget] = useState(DEFAULT_PERFORMANCE_STATE.fitnessTarget);
  const [hustleTarget, setHustleTarget] = useState(DEFAULT_PERFORMANCE_STATE.hustleTarget);
  const [careerTarget, setCareerTarget] = useState(DEFAULT_PERFORMANCE_STATE.careerTarget);
  const [academicDeadline, setAcademicDeadline] = useState(DEFAULT_PERFORMANCE_STATE.academicDeadline);
  const [fitnessDeadline, setFitnessDeadline] = useState(DEFAULT_PERFORMANCE_STATE.fitnessDeadline);
  const [hustleDeadline, setHustleDeadline] = useState(DEFAULT_PERFORMANCE_STATE.hustleDeadline);
  const [careerDeadline, setCareerDeadline] = useState(DEFAULT_PERFORMANCE_STATE.careerDeadline);

  const [prevAcademicScore, setPrevAcademicScore] = useState(0);
  const [prevFitnessScore, setPrevFitnessScore] = useState(0);
  const [prevHustleScore, setPrevHustleScore] = useState(0);
  const [prevCareerScore, setPrevCareerScore] = useState(0);
  const [academicUpdatedAt, setAcademicUpdatedAt] = useState("");
  const [fitnessUpdatedAt, setFitnessUpdatedAt] = useState("");
  const [hustleUpdatedAt, setHustleUpdatedAt] = useState("");
  const [careerUpdatedAt, setCareerUpdatedAt] = useState("");
  const [performanceHistory, setPerformanceHistory] = useState<HistoryEntry[]>([]);

  const [isHydrated, setIsHydrated] = useState(false);

  const getLocalDateKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, "0");
    const day = `${today.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const rehydratePerformanceData = useCallback(async () => {
    setIsHydrated(false);
    try {
      const storedHistory = await getJSON<HistoryEntry[]>("performanceHistory", []);
      setPerformanceHistory(Array.isArray(storedHistory) ? storedHistory : []);

      const parsedState = await getJSON<Partial<PersistedPerformanceState> | null>(
        PERFORMANCE_STORAGE_KEY,
        null
      );
      if (!parsedState) {
        setAcademicScoreState(DEFAULT_PERFORMANCE_STATE.academicScore);
        setFitnessScoreState(DEFAULT_PERFORMANCE_STATE.fitnessScore);
        setHustleScoreState(DEFAULT_PERFORMANCE_STATE.hustleScore);
        setCareerScoreState(DEFAULT_PERFORMANCE_STATE.careerScore);
        setPrevAcademicScore(DEFAULT_PERFORMANCE_STATE.prevAcademicScore);
        setPrevFitnessScore(DEFAULT_PERFORMANCE_STATE.prevFitnessScore);
        setPrevHustleScore(DEFAULT_PERFORMANCE_STATE.prevHustleScore);
        setPrevCareerScore(DEFAULT_PERFORMANCE_STATE.prevCareerScore);
        setAcademicUpdatedAt(DEFAULT_PERFORMANCE_STATE.academicUpdatedAt);
        setFitnessUpdatedAt(DEFAULT_PERFORMANCE_STATE.fitnessUpdatedAt);
        setHustleUpdatedAt(DEFAULT_PERFORMANCE_STATE.hustleUpdatedAt);
        setCareerUpdatedAt(DEFAULT_PERFORMANCE_STATE.careerUpdatedAt);
        setAcademicTarget(DEFAULT_PERFORMANCE_STATE.academicTarget);
        setFitnessTarget(DEFAULT_PERFORMANCE_STATE.fitnessTarget);
        setHustleTarget(DEFAULT_PERFORMANCE_STATE.hustleTarget);
        setCareerTarget(DEFAULT_PERFORMANCE_STATE.careerTarget);
        setAcademicDeadline(DEFAULT_PERFORMANCE_STATE.academicDeadline);
        setFitnessDeadline(DEFAULT_PERFORMANCE_STATE.fitnessDeadline);
        setHustleDeadline(DEFAULT_PERFORMANCE_STATE.hustleDeadline);
        setCareerDeadline(DEFAULT_PERFORMANCE_STATE.careerDeadline);
        return;
      }

      setAcademicScoreState(Number(parsedState.academicScore ?? DEFAULT_PERFORMANCE_STATE.academicScore));
      setFitnessScoreState(Number(parsedState.fitnessScore ?? DEFAULT_PERFORMANCE_STATE.fitnessScore));
      setHustleScoreState(Number(parsedState.hustleScore ?? DEFAULT_PERFORMANCE_STATE.hustleScore));
      setCareerScoreState(Number(parsedState.careerScore ?? DEFAULT_PERFORMANCE_STATE.careerScore));
      setPrevAcademicScore(Number(parsedState.prevAcademicScore ?? DEFAULT_PERFORMANCE_STATE.prevAcademicScore));
      setPrevFitnessScore(Number(parsedState.prevFitnessScore ?? DEFAULT_PERFORMANCE_STATE.prevFitnessScore));
      setPrevHustleScore(Number(parsedState.prevHustleScore ?? DEFAULT_PERFORMANCE_STATE.prevHustleScore));
      setPrevCareerScore(Number(parsedState.prevCareerScore ?? DEFAULT_PERFORMANCE_STATE.prevCareerScore));
      setAcademicUpdatedAt(parsedState.academicUpdatedAt ?? DEFAULT_PERFORMANCE_STATE.academicUpdatedAt);
      setFitnessUpdatedAt(parsedState.fitnessUpdatedAt ?? DEFAULT_PERFORMANCE_STATE.fitnessUpdatedAt);
      setHustleUpdatedAt(parsedState.hustleUpdatedAt ?? DEFAULT_PERFORMANCE_STATE.hustleUpdatedAt);
      setCareerUpdatedAt(parsedState.careerUpdatedAt ?? DEFAULT_PERFORMANCE_STATE.careerUpdatedAt);
      setAcademicTarget(Number(parsedState.academicTarget ?? DEFAULT_PERFORMANCE_STATE.academicTarget));
      setFitnessTarget(Number(parsedState.fitnessTarget ?? DEFAULT_PERFORMANCE_STATE.fitnessTarget));
      setHustleTarget(Number(parsedState.hustleTarget ?? DEFAULT_PERFORMANCE_STATE.hustleTarget));
      setCareerTarget(Number(parsedState.careerTarget ?? DEFAULT_PERFORMANCE_STATE.careerTarget));
      setAcademicDeadline(String(parsedState.academicDeadline ?? DEFAULT_PERFORMANCE_STATE.academicDeadline));
      setFitnessDeadline(String(parsedState.fitnessDeadline ?? DEFAULT_PERFORMANCE_STATE.fitnessDeadline));
      setHustleDeadline(String(parsedState.hustleDeadline ?? DEFAULT_PERFORMANCE_STATE.hustleDeadline));
      setCareerDeadline(String(parsedState.careerDeadline ?? DEFAULT_PERFORMANCE_STATE.careerDeadline));
    } catch (error) {
      console.error("Failed to load performance state", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    rehydratePerformanceData();
  }, [rehydratePerformanceData]);


  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const savePerformanceState = async () => {
      try {
        const stateToSave: PersistedPerformanceState = {
          academicScore,
          fitnessScore,
          hustleScore,
          careerScore,
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
        };

        await setJSON(PERFORMANCE_STORAGE_KEY, stateToSave);
      } catch (error) {
        console.error("Failed to save performance state", error);
      }
    };

    savePerformanceState();
  }, [
    isHydrated,
    academicScore,
    fitnessScore,
    hustleScore,
    careerScore,
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
  ]);

  const setAcademicScore = (score: number) => {
    setAcademicScoreState((current) => {
      if (current !== score) {
        setPrevAcademicScore(current);
        setAcademicUpdatedAt(new Date().toISOString());
      }
      return score;
    });
  };

  const setFitnessScore = (score: number) => {
    setFitnessScoreState((current) => {
      if (current !== score) {
        setPrevFitnessScore(current);
        setFitnessUpdatedAt(new Date().toISOString());
      }
      return score;
    });
  };

  const setHustleScore = (score: number) => {
    setHustleScoreState((current) => {
      if (current !== score) {
        setPrevHustleScore(current);
        setHustleUpdatedAt(new Date().toISOString());
      }
      return score;
    });
  };

  const setCareerScore = (score: number) => {
    setCareerScoreState((current) => {
      if (current !== score) {
        setPrevCareerScore(current);
        setCareerUpdatedAt(new Date().toISOString());
      }
      return score;
    });
  };

  const savePerformanceHistory = useCallback(async (history: HistoryEntry[]) => {
    setPerformanceHistory(history);
    await setJSON("performanceHistory", history);
  }, []);

  const resetPerformanceData = useCallback(async () => {
    setAcademicScoreState(DEFAULT_PERFORMANCE_STATE.academicScore);
    setFitnessScoreState(DEFAULT_PERFORMANCE_STATE.fitnessScore);
    setHustleScoreState(DEFAULT_PERFORMANCE_STATE.hustleScore);
    setCareerScoreState(DEFAULT_PERFORMANCE_STATE.careerScore);
    setPrevAcademicScore(DEFAULT_PERFORMANCE_STATE.prevAcademicScore);
    setPrevFitnessScore(DEFAULT_PERFORMANCE_STATE.prevFitnessScore);
    setPrevHustleScore(DEFAULT_PERFORMANCE_STATE.prevHustleScore);
    setPrevCareerScore(DEFAULT_PERFORMANCE_STATE.prevCareerScore);
    setAcademicUpdatedAt(DEFAULT_PERFORMANCE_STATE.academicUpdatedAt);
    setFitnessUpdatedAt(DEFAULT_PERFORMANCE_STATE.fitnessUpdatedAt);
    setHustleUpdatedAt(DEFAULT_PERFORMANCE_STATE.hustleUpdatedAt);
    setCareerUpdatedAt(DEFAULT_PERFORMANCE_STATE.careerUpdatedAt);
    setAcademicTarget(DEFAULT_PERFORMANCE_STATE.academicTarget);
    setFitnessTarget(DEFAULT_PERFORMANCE_STATE.fitnessTarget);
    setHustleTarget(DEFAULT_PERFORMANCE_STATE.hustleTarget);
    setCareerTarget(DEFAULT_PERFORMANCE_STATE.careerTarget);
    setAcademicDeadline(DEFAULT_PERFORMANCE_STATE.academicDeadline);
    setFitnessDeadline(DEFAULT_PERFORMANCE_STATE.fitnessDeadline);
    setHustleDeadline(DEFAULT_PERFORMANCE_STATE.hustleDeadline);
    setCareerDeadline(DEFAULT_PERFORMANCE_STATE.careerDeadline);
    setPerformanceHistory([]);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const today = getLocalDateKey();

    const existingEntry = performanceHistory.find((entry) => entry.date === today);

    if (
      existingEntry &&
      existingEntry.academic === academicScore &&
      existingEntry.fitness === fitnessScore &&
      existingEntry.hustle === hustleScore &&
      existingEntry.career === careerScore
    ) {
      return;
    }

    const newEntry = {
      date: today,
      academic: academicScore,
      fitness: fitnessScore,
      hustle: hustleScore,
      career: careerScore,
    };

    let updatedHistory: HistoryEntry[];

    if (existingEntry) {
      updatedHistory = performanceHistory.map((entry) =>
        entry.date === today ? newEntry : entry
      );
    } else {
      updatedHistory = [...performanceHistory, newEntry];
    }

    savePerformanceHistory(updatedHistory);
  }, [
    isHydrated,
    performanceHistory,
    academicScore,
    fitnessScore,
    hustleScore,
    careerScore,
    savePerformanceHistory,
  ]);

  return (
    <PerformanceContext.Provider
      value={{
        academicScore,
        fitnessScore,
        hustleScore,
        careerScore,
        performanceHistory,
        academicTarget,
        fitnessTarget,
        hustleTarget,
        careerTarget,
        academicDeadline,
        fitnessDeadline,
        hustleDeadline,
        careerDeadline,
        prevAcademicScore,
        prevFitnessScore,
        prevHustleScore,
        prevCareerScore,
        academicUpdatedAt,
        fitnessUpdatedAt,
        hustleUpdatedAt,
        careerUpdatedAt,
        setAcademicScore,
        setFitnessScore,
        setHustleScore,
        setCareerScore,
        setAcademicTarget,
        setFitnessTarget,
        setHustleTarget,
        setCareerTarget,
        setAcademicDeadline,
        setFitnessDeadline,
        setHustleDeadline,
        setCareerDeadline,
        savePerformanceHistory,
        resetPerformanceData,
        rehydratePerformanceData,
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
};
