import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { HabitProvider } from "../context/HabitContext";
import { NotificationProvider } from "../context/NotificationContext";
import { PerformanceProvider } from "../context/PerformanceContext";
import { ProfileProvider } from "../context/ProfileContext";
import { ThemeProvider } from "../context/theme";

function NotificationNavigationListener() {
  useEffect(() => {
    const openRoute = (route: unknown) => {
      if (typeof route === "string" && route.length > 0) {
        router.navigate(route as any);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openRoute(response.notification.request.content.data?.route);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openRoute(response.notification.request.content.data?.route);
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
    });

    return () => sub.remove();
  }, []);

  return null;
}

export default function Layout() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <HabitProvider>
          <NotificationProvider>
            <PerformanceProvider>
              <NotificationNavigationListener />
              <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="dashboard" />
                <Stack.Screen name="revision" />
                <Stack.Screen name="gym" />
                <Stack.Screen name="hustle" />
                <Stack.Screen name="cv" />
                <Stack.Screen name="targets" />
                <Stack.Screen name="habits" />
                <Stack.Screen name="weekly-review" />
                <Stack.Screen name="analytics" />
                <Stack.Screen name="privacy" />
                <Stack.Screen name="disclaimer" />
              </Stack>
            </PerformanceProvider>
          </NotificationProvider>
        </HabitProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}

