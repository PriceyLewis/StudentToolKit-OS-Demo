import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  cancelScheduled,
  DAILY_REMINDER_ID_KEY,
  requestNotificationPermission,
  scheduleDailyReminder,
  scheduleWeeklyReminder,
  WEEKLY_REMINDER_ID_KEY,
} from "../src/utils/notifications";
import { getJSON, removeKey, setJSON } from "../src/utils/storage";

type NotificationPrefs = {
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
};

type NotificationContextValue = {
  prefs: NotificationPrefs;
  setDailyEnabled: (enabled: boolean) => Promise<void>;
  setWeeklyEnabled: (enabled: boolean) => Promise<void>;
  resetNotificationPrefs: () => Promise<void>;
  rehydrateNotificationPrefs: () => Promise<void>;
};

const PREFS_KEY = "notificationPrefs";

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    dailyEnabled: false,
    weeklyEnabled: false,
  });
  const [dailyId, setDailyId] = useState<string | null>(null);
  const [weeklyId, setWeeklyId] = useState<string | null>(null);

  const rehydrateNotificationPrefs = useCallback(async () => {
    const p = await getJSON<NotificationPrefs>(PREFS_KEY, {
      dailyEnabled: false,
      weeklyEnabled: false,
    });
    setPrefs(p);

    const d = await getJSON<string | null>(DAILY_REMINDER_ID_KEY, null);
    const w = await getJSON<string | null>(WEEKLY_REMINDER_ID_KEY, null);
    setDailyId(d);
    setWeeklyId(w);
  }, []);

  useEffect(() => {
    rehydrateNotificationPrefs();
  }, [rehydrateNotificationPrefs]);

  const savePrefs = useCallback(async (next: NotificationPrefs) => {
    setPrefs(next);
    await setJSON(PREFS_KEY, next);
  }, []);

  const setDailyEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        return;
      }
      const id = await scheduleDailyReminder(20, 0);
      setDailyId(id);
      await setJSON(DAILY_REMINDER_ID_KEY, id);
    } else {
      await cancelScheduled(dailyId);
      setDailyId(null);
      await removeKey(DAILY_REMINDER_ID_KEY);
    }

    const next = { ...prefs, dailyEnabled: enabled };
    await savePrefs(next);
  }, [dailyId, prefs, savePrefs]);

  const setWeeklyEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        return;
      }
      const id = await scheduleWeeklyReminder(2, 18, 0);
      setWeeklyId(id);
      await setJSON(WEEKLY_REMINDER_ID_KEY, id);
    } else {
      await cancelScheduled(weeklyId);
      setWeeklyId(null);
      await removeKey(WEEKLY_REMINDER_ID_KEY);
    }

    const next = { ...prefs, weeklyEnabled: enabled };
    await savePrefs(next);
  }, [prefs, savePrefs, weeklyId]);

  const resetNotificationPrefs = useCallback(async () => {
    await cancelScheduled(dailyId);
    await cancelScheduled(weeklyId);
    setDailyId(null);
    setWeeklyId(null);
    await removeKey(DAILY_REMINDER_ID_KEY);
    await removeKey(WEEKLY_REMINDER_ID_KEY);
    await savePrefs({ dailyEnabled: false, weeklyEnabled: false });
  }, [dailyId, savePrefs, weeklyId]);

  return (
    <NotificationContext.Provider
      value={{
        prefs,
        setDailyEnabled,
        setWeeklyEnabled,
        resetNotificationPrefs,
        rehydrateNotificationPrefs,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationPrefs() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationPrefs must be used inside NotificationProvider");
  }
  return context;
}

