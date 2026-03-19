import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const DAILY_REMINDER_ID_KEY = "notif_daily_id";
export const WEEKLY_REMINDER_ID_KEY = "notif_weekly_id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status === "granted") {
    return true;
  }

  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function scheduleDailyReminder(hour = 20, minute = 0) {
  await ensureAndroidChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily check-in",
      body: "Tick off your habits and keep your streak alive.",
      data: { route: "/dashboard" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleWeeklyReminder(
  weekday = 1,
  hour = 18,
  minute = 0
) {
  await ensureAndroidChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Weekly review",
      body: "Review your progress and plan the next week.",
      data: { route: "/weekly-review" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
    },
  });
}

export async function cancelScheduled(id?: string | null) {
  if (!id) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Ignore invalid stale ids.
  }
}
