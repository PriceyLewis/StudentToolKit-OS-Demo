import { useContext, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { PerformanceContext } from "../context/PerformanceContext";
import { useThemedStyles, type AppThemeTokens } from "../context/theme";
import { getJSON, setJSON } from "../src/utils/storage";

const GYM_FORM_STORAGE_KEY = "gymFormState";

export default function GymScreen() {
  const styles = useThemedStyles(createStyles);
  const [days, setDays] = useState("");
  const [goal, setGoal] = useState<"gain" | "lose" | "maintain">("gain");
  const [isHydrated, setIsHydrated] = useState(false);

  const { setFitnessScore } = useContext(PerformanceContext);

  const daysNumber = parseInt(days) || 0;

  const generatePlan = () => {
    if (daysNumber <= 0) return [];
    const basePlan = [
      "Upper Body",
      "Lower Body",
      "Push",
      "Pull",
      "Legs",
      "Core + Cardio",
      "Full Body",
    ];
    return basePlan.slice(0, daysNumber);
  };

  const workoutPlan = generatePlan();

  const calculateFitnessScore = () => {
    let score = 0;
    if (daysNumber >= 3) score += 30;
    if (daysNumber >= 5) score += 20;
    if (goal === "gain" || goal === "lose") score += 20;
    if (goal === "maintain") score += 10;
    return Math.min(score, 100);
  };

  const fitnessScore = calculateFitnessScore();

  useEffect(() => {
    setFitnessScore(fitnessScore);
  }, [fitnessScore, setFitnessScore]);

  useEffect(() => {
    const loadFormState = async () => {
      try {
        const parsed = await getJSON<{
          days?: string;
          goal?: "gain" | "lose" | "maintain";
        } | null>(GYM_FORM_STORAGE_KEY, null);
        if (!parsed) {
          return;
        }

        setDays(parsed.days ?? "");
        setGoal(parsed.goal ?? "gain");
      } catch (error) {
        console.error("Failed to load gym form state", error);
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
        await setJSON(GYM_FORM_STORAGE_KEY, { days, goal });
      } catch (error) {
        console.error("Failed to save gym form state", error);
      }
    };

    saveFormState();
  }, [isHydrated, days, goal]);

  const exportPDF = async () => {
    const list = workoutPlan.map((day) => `<li>${day}</li>`).join("");
    const html = `
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h1>Weekly Physical Conditioning Plan</h1>
          <p><strong>Goal:</strong> ${goal}</p>
          <ul>${list}</ul>
          <p style="margin-top:20px; font-size:12px; color:grey;">
            This is a general educational template. Consult a professional before starting a new fitness program.
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
        <Text style={styles.eyebrow}>Physical Training</Text>
        <Text style={styles.title}>Physical Conditioning Planner</Text>
        <Text style={styles.subtitle}>
          Set your weekly structure, choose a goal, and generate a repeatable training rhythm.
        </Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Score</Text>
            <Text style={styles.heroStatValue}>{fitnessScore}/100</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Plan days</Text>
            <Text style={styles.heroStatValue}>{daysNumber || "-"}</Text>
          </View>
        </View>
      </View>

      <TextInput
        placeholder="Days Per Week"
        value={days}
        style={styles.input}
        keyboardType="numeric"
        onChangeText={setDays}
      />

      <View style={styles.goalRow}>
        <TouchableOpacity activeOpacity={0.8}
          style={[styles.goalButton, goal === "gain" && styles.active]}
          onPress={() => setGoal("gain")}
        >
          <Text>Muscle Gain</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8}
          style={[styles.goalButton, goal === "lose" && styles.active]}
          onPress={() => setGoal("lose")}
        >
          <Text>Fat Loss</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8}
          style={[styles.goalButton, goal === "maintain" && styles.active]}
          onPress={() => setGoal("maintain")}
        >
          <Text>Maintain</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Your Weekly Structure</Text>
        {workoutPlan.length > 0 ? (
          workoutPlan.map((day, index) => (
            <Text key={index} style={styles.sectionText}>
              - Day {index + 1}: {day}
            </Text>
          ))
        ) : (
          <Text style={styles.sectionText}>Enter days per week to generate plan</Text>
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
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
  },
  goalRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  goalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  active: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  preview: {
    marginTop: SPACING.xxl,
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
