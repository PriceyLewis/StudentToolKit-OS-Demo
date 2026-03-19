import { useContext, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { PerformanceContext } from "../context/PerformanceContext";
import { useThemedStyles, type AppThemeTokens } from "../context/theme";
import { getJSON, setJSON } from "../src/utils/storage";

const HUSTLE_FORM_STORAGE_KEY = "hustleFormState";

export default function HustleScreen() {
  const styles = useThemedStyles(createStyles);
  const [skills, setSkills] = useState("");
  const [time, setTime] = useState("");
  const [budget, setBudget] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  const { setHustleScore } = useContext(PerformanceContext);

  const skillList = skills ? skills.split(",").map((s) => s.trim()) : [];

  const calculateHustleScore = () => {
    const timeNumber = parseInt(time) || 0;
    const budgetNumber = parseInt(budget) || 0;
    let score = 0;
    if (skills.length > 3) score += 25;
    if (timeNumber >= 5) score += 30;
    if (budgetNumber > 0) score += 20;
    return Math.min(score, 100);
  };

  const hustleScore = calculateHustleScore();

  useEffect(() => {
    setHustleScore(hustleScore);
  }, [hustleScore, setHustleScore]);

  useEffect(() => {
    const loadFormState = async () => {
      try {
        const parsed = await getJSON<{
          skills?: string;
          time?: string;
          budget?: string;
        } | null>(HUSTLE_FORM_STORAGE_KEY, null);
        if (!parsed) {
          return;
        }

        setSkills(parsed.skills ?? "");
        setTime(parsed.time ?? "");
        setBudget(parsed.budget ?? "");
      } catch (error) {
        console.error("Failed to load hustle form state", error);
      } finally {
        setIsHydrated(true);
      }
    };

    loadFormState();
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const saveFormState = async () => {
      try {
        await setJSON(HUSTLE_FORM_STORAGE_KEY, { skills, time, budget });
      } catch (error) {
        console.error("Failed to save hustle form state", error);
      }
    };

    saveFormState();
  }, [isHydrated, skills, time, budget]);

  const generatePlan = () => {
    if (skillList.length === 0) return [];
    return [
      "Week 1: Research market and validate idea",
      "Week 2: Build basic offer or service",
      "Week 3: Start outreach and marketing",
      "Week 4: Refine from feedback and scale",
    ];
  };

  const actionPlan = generatePlan();

  const exportPDF = async () => {
    const list = actionPlan.map((step) => `<li>${step}</li>`).join("");
    const html = `
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h1>30-Day Income Development Plan</h1>
          <p><strong>Skills:</strong> ${skills}</p>
          <p><strong>Time Available:</strong> ${time}</p>
          <p><strong>Budget:</strong> ${budget}</p>
          <ul>${list}</ul>
          <p style="margin-top:20px; font-size:12px; color:grey;">
            This is an educational planning template. Results depend on execution and market conditions.
          </p>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Income Growth</Text>
        <Text style={styles.title}>Income Development Planner</Text>
        <Text style={styles.subtitle}>
          Shape a simple 30-day execution plan from your skills, available time, and starting budget.
        </Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Score</Text>
            <Text style={styles.heroStatValue}>{hustleScore}/100</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Skills added</Text>
            <Text style={styles.heroStatValue}>{skillList.length}</Text>
          </View>
        </View>
      </View>

      <TextInput
        placeholder="Your Skills (comma separated)"
        value={skills}
        style={styles.input}
        onChangeText={setSkills}
      />

      <TextInput
        placeholder="Hours Per Week Available"
        value={time}
        style={styles.input}
        onChangeText={setTime}
      />

      <TextInput
        placeholder="Starting Budget"
        value={budget}
        style={styles.input}
        onChangeText={setBudget}
      />

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>30-Day Action Plan</Text>
        {actionPlan.length > 0 ? (
          actionPlan.map((step, index) => (
            <Text key={index} style={styles.sectionText}>
              - {step}
            </Text>
          ))
        ) : (
          <Text style={styles.sectionText}>Enter your skills to generate plan</Text>
        )}
      </View>

      <TouchableOpacity activeOpacity={0.8} style={styles.exportButton} onPress={exportPDF}>
        <Text style={styles.exportText}>Download PDF</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) => StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    backgroundColor: COLORS.backgroundAlt,
    flexGrow: 1,
  },
  heroCard: {
    marginBottom: SPACING.xxl,
    padding: SPACING.xxl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    marginBottom: SPACING.sm,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: SPACING.lg,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  heroStatLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroStatValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
  },
  preview: {
    marginTop: SPACING.section,
    padding: SPACING.card,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  previewTitle: { fontSize: 18, fontWeight: "700", marginBottom: SPACING.md, color: COLORS.textPrimary },
  sectionText: { marginTop: SPACING.xs, lineHeight: 22, color: COLORS.textSecondary },
  exportButton: {
    marginTop: SPACING.xxl,
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.xl,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  exportText: { color: COLORS.white, fontWeight: "700" },
});
