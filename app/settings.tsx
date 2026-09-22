import { useRouter } from "expo-router";
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import AppNavigation from "../components/AppNavigation";
import { useNotificationPrefs } from "../context/NotificationContext";
import { useTheme, useThemedStyles, type AppThemeTokens } from "../context/theme";

const themeOptions = [
  { key: "clean", label: "Clean Light" },
  { key: "dark", label: "Dark" },
  { key: "midnight", label: "Midnight" },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const { prefs, setDailyEnabled, setWeeklyEnabled } = useNotificationPrefs();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <AppNavigation active="Settings" />
        <Text style={styles.eyebrow}>Workspace</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Personalise the dashboard and manage your planning workspace.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>
          <Text style={styles.cardBody}>Choose a dashboard theme stored locally on this device.</Text>
          <View style={styles.optionRow}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.option, mode === option.key ? styles.optionActive : null]}
                onPress={() => setMode(option.key)}
              >
                <Text style={[styles.optionText, mode === option.key ? styles.optionTextActive : null]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reminders</Text>
          {Platform.OS === "web" ? <Text style={styles.cardBody}>Scheduled reminders are available in the Android and iOS app.</Text> : null}
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Daily reminder</Text>
              <Text style={styles.cardBody}>Keep today’s priorities visible.</Text>
            </View>
            <Switch accessibilityLabel="Daily reminder" disabled={Platform.OS === "web"} value={prefs.dailyEnabled} onValueChange={setDailyEnabled} />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Weekly review reminder</Text>
              <Text style={styles.cardBody}>Prompt a regular progress reset.</Text>
            </View>
            <Switch accessibilityLabel="Weekly review reminder" disabled={Platform.OS === "web"} value={prefs.weeklyEnabled} onValueChange={setWeeklyEnabled} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workspace tools</Text>
          <View style={styles.linkGrid}>
            <TouchableOpacity style={styles.link} onPress={() => router.push("/targets" as any)}><Text style={styles.linkText}>Edit targets and deadlines</Text></TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => router.push("/habits" as any)}><Text style={styles.linkText}>Manage habits</Text></TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => router.push("/privacy" as any)}><Text style={styles.linkText}>Privacy policy</Text></TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => router.push("/disclaimer" as any)}><Text style={styles.linkText}>Terms of use</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) => StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.backgroundAlt },
  scrollContent: { flexGrow: 1, padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  content: { width: "100%", maxWidth: 900, alignSelf: "center" },
  eyebrow: { color: COLORS.primary, fontWeight: "800", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: SPACING.md },
  title: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 32, marginTop: SPACING.xs },
  subtitle: { color: COLORS.textMuted, lineHeight: 20, marginTop: SPACING.xs, marginBottom: SPACING.xl },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.card, padding: SPACING.xl, marginBottom: SPACING.md },
  cardTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "800", marginBottom: SPACING.xs },
  cardBody: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.md },
  option: { flex: 1, minWidth: 130, alignItems: "center", padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md },
  optionActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  optionText: { color: COLORS.textMuted, fontWeight: "700" },
  optionTextActive: { color: COLORS.primary },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.md, paddingTop: SPACING.lg },
  settingCopy: { flex: 1 },
  settingTitle: { color: COLORS.textPrimary, fontWeight: "700", marginBottom: 2 },
  linkGrid: { gap: SPACING.sm, marginTop: SPACING.md },
  link: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  linkText: { color: COLORS.primary, fontWeight: "700" },
});
