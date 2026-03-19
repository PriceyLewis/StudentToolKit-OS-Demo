import { useContext, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { PerformanceContext } from "../context/PerformanceContext";
import { useThemedStyles, type AppThemeTokens } from "../context/theme";
import { getJSON, setJSON } from "../src/utils/storage";

const REVISION_FORM_STORAGE_KEY = "revisionFormState";

export default function RevisionScreen() {
  const styles = useThemedStyles(createStyles);
  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState("");
  const [examDate, setExamDate] = useState("");
  const [intensity, setIntensity] = useState<"light" | "balanced" | "intensive">("balanced");
  const [isHydrated, setIsHydrated] = useState(false);

  const { setAcademicScore } = useContext(PerformanceContext);

  const subjectArray = subjects ? subjects.split(",").map((s) => s.trim()) : [];
  const totalHours = parseInt(hours) || 0;

  const calculateWeeks = () => {
    if (!examDate) return 0;
    const today = new Date();
    const exam = new Date(examDate);
    const diffTime = exam.getTime() - today.getTime();
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks > 0 ? Math.ceil(diffWeeks) : 0;
  };

  const weeksUntilExam = calculateWeeks();
  const reviewBuffer = totalHours * 0.2;
  const effectiveHours = totalHours - reviewBuffer;

  let intensityMultiplier = 1;
  if (intensity === "light") intensityMultiplier = 0.8;
  if (intensity === "intensive") intensityMultiplier = 1.2;

  const adjustedHours = effectiveHours * intensityMultiplier;
  const hoursPerSubject =
    subjectArray.length > 0 ? (adjustedHours / subjectArray.length).toFixed(1) : "0";

  const calculateAcademicScore = () => {
    if (!weeksUntilExam || !totalHours) return 0;
    let score = 0;
    if (totalHours >= 10) score += 30;
    if (intensity === "balanced") score += 20;
    if (intensity === "intensive") score += 30;
    if (weeksUntilExam >= 4) score += 20;
    return Math.min(score, 100);
  };

  const academicScore = calculateAcademicScore();

  useEffect(() => {
    setAcademicScore(academicScore);
  }, [academicScore, setAcademicScore]);

  useEffect(() => {
    const loadFormState = async () => {
      try {
        const parsed = await getJSON<{
          subjects?: string;
          hours?: string;
          examDate?: string;
          intensity?: "light" | "balanced" | "intensive";
        } | null>(REVISION_FORM_STORAGE_KEY, null);
        if (!parsed) {
          return;
        }

        setSubjects(parsed.subjects ?? "");
        setHours(parsed.hours ?? "");
        setExamDate(parsed.examDate ?? "");
        setIntensity(parsed.intensity ?? "balanced");
      } catch (error) {
        console.error("Failed to load revision form state", error);
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
        await setJSON(REVISION_FORM_STORAGE_KEY, { subjects, hours, examDate, intensity });
      } catch (error) {
        console.error("Failed to save revision form state", error);
      }
    };

    saveFormState();
  }, [isHydrated, subjects, hours, examDate, intensity]);

  const exportPDF = async () => {
    const list = subjectArray
      .map((s) => `<li>${s} - ${hoursPerSubject} hrs/week</li>`)
      .join("");

    const html = `
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h1>Exam Performance Plan</h1>
          <p><strong>Exam Date:</strong> ${examDate}</p>
          <p><strong>Weeks Until Exam:</strong> ${weeksUntilExam}</p>
          <p><strong>Total Weekly Hours:</strong> ${totalHours}</p>
          <p><strong>Review Buffer (20%):</strong> ${reviewBuffer.toFixed(1)} hrs</p>
          <h2>Study Distribution</h2>
          <ul>${list}</ul>
          <p style="margin-top:20px; font-size:12px; color:grey;">
            This is a structured educational template to optimize weekly revision.
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
        <Text style={styles.eyebrow}>Academic Planning</Text>
        <Text style={styles.title}>Academic Performance Planner</Text>
        <Text style={styles.subtitle}>
          Turn subjects, exam timing, and weekly hours into a structured revision plan.
        </Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Score</Text>
            <Text style={styles.heroStatValue}>{academicScore}/100</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Exam runway</Text>
            <Text style={styles.heroStatValue}>{weeksUntilExam || "-"}</Text>
          </View>
        </View>
      </View>

      <TextInput
        placeholder="Subjects (comma separated)"
        value={subjects}
        style={styles.input}
        onChangeText={setSubjects}
      />

      <TextInput
        placeholder="Exam Date (YYYY-MM-DD)"
        value={examDate}
        style={styles.input}
        onChangeText={setExamDate}
      />

      <TextInput
        placeholder="Total Study Hours Per Week"
        value={hours}
        style={styles.input}
        keyboardType="numeric"
        onChangeText={setHours}
      />

      <View style={styles.intensityRow}>
        <TouchableOpacity activeOpacity={0.8}
          style={[styles.intensityButton, intensity === "light" && styles.active]}
          onPress={() => setIntensity("light")}
        >
          <Text>Light</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8}
          style={[styles.intensityButton, intensity === "balanced" && styles.active]}
          onPress={() => setIntensity("balanced")}
        >
          <Text>Balanced</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8}
          style={[styles.intensityButton, intensity === "intensive" && styles.active]}
          onPress={() => setIntensity("intensive")}
        >
          <Text>Intensive</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Performance Summary</Text>

        <Text style={styles.metricText}>Weeks Until Exam: {weeksUntilExam || "-"}</Text>
        <Text style={styles.metricText}>Total Weekly Hours: {totalHours || "-"}</Text>
        <Text style={styles.metricText}>Review Buffer (20%): {reviewBuffer.toFixed(1)} hrs</Text>

        <Text style={styles.divider}>Study Distribution</Text>

        {subjectArray.length > 0 ? (
          subjectArray.map((subject, index) => (
            <Text key={index} style={styles.sectionText}>
              - {subject} - {hoursPerSubject} hrs/week
            </Text>
          ))
        ) : (
          <Text style={styles.sectionText}>Add subjects and study hours to generate your structured revision plan</Text>
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
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
  },
  intensityRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  intensityButton: {
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
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: SPACING.md,
    color: COLORS.textPrimary,
  },
  metricText: {
    marginTop: SPACING.xs,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  divider: {
    marginTop: SPACING.xxl,
    fontWeight: "700",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  sectionText: {
    marginTop: SPACING.xs,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  exportButton: {
    marginTop: SPACING.xxl,
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.xl,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  exportText: {
    color: COLORS.white,
    fontWeight: "700",
  },
});
