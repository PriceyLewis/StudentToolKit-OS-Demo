import { removeKeys } from "./storage";

export const APP_DATA_KEYS = [
  "profile",
  "profileData",
  "performance",
  "performanceState",
  "history",
  "performanceHistory",
  "targets",
  "revisionFormState",
  "gymFormState",
  "hustleFormState",
  "cvFormState",
  "academicForm",
  "fitnessForm",
  "incomeForm",
  "cvForm",
  "habits",
  "habitCompletion",
  "focusTimerState",
  "dashboardThemePreset",
  "appThemeMode",
  "notificationPrefs",
  "notif_daily_id",
  "notif_weekly_id",
] as const;

export async function resetLocalData() {
  await removeKeys([...APP_DATA_KEYS] as string[]);
}
