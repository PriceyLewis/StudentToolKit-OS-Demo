import { useContext, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { PerformanceContext } from "../context/PerformanceContext";
import { useTheme, useThemedStyles, type AppThemeTokens } from "../context/theme";
import { getJSON, setJSON } from "../src/utils/storage";
import {
  buildRevisionPlan,
  parseSubjects,
  type RevisionConfidence,
} from "../src/utils/revisionPlanner.js";

const REVISION_FORM_STORAGE_KEY = "revisionFormState";

const confidenceOptions: { value: RevisionConfidence; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export default function RevisionScreen() {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState("");
  const [examDate, setExamDate] = useState("");
  const [availabilityDays, setAvailabilityDays] = useState("5");
  const [intensity, setIntensity] = useState<"light" | "balanced" | "intensive">("balanced");
  const [confidenceBySubject, setConfidenceBySubject] = useState<Record<string, RevisionConfidence>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  const { setAcademicScore } = useContext(PerformanceContext);
  const subjectArray = useMemo(() => parseSubjects(subjects), [subjects]);

  const plan = useMemo(
    () =>
      buildRevisionPlan({
        subjects: subjectArray,
        weeklyHours: hours,
        examDate,
        intensity,
        availabilityDays,
        confidenceBySubject,
      }),
    [availabilityDays, confidenceBySubject, examDate, hours, intensity, subjectArray],
  );

  useEffect(() => {
    setConfidenceBySubject((current) => {
      const next: Record<string, RevisionConfidence> = {};
      subjectArray.forEach((subject) => {
        next[subject] = current[subject] ?? "medium";
      });

      const unchanged =
        Object.keys(next).length === Object.keys(current).length &&
        Object.entries(next).every(([key, value]) => current[key] === value);

      return unchanged ? current : next;
    });
  }, [subjectArray]);

  useEffect(() => {
    setAcademicScore(plan.readinessScore);
  }, [plan.readinessScore, setAcademicScore]);

  useEffect(() => {
    const loadFormState = async () => {
      try {
        const parsed = await getJSON<{
          subjects?: string;
          hours?: string;
          examDate?: string;
          availabilityDays?: string;
          intensity?: "light" | "balanced" | "intensive";
          confidenceBySubject?: Record<string, RevisionConfidence>;
        } | null>(REVISION_FORM_STORAGE_KEY, null);

        if (!parsed) {
          return;
        }

        setSubjects(parsed.subjects ?? "");
        setHours(parsed.hours ?? "");
        setExamDate(parsed.examDate ?? "");
        setAvailabilityDays(parsed.availabilityDays ?? "5");
        setIntensity(parsed.intensity ?? "balanced");
        setConfidenceBySubject(parsed.confidenceBySubject ?? {});
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
        await setJSON(REVISION_FORM_STORAGE_KEY, {
          subjects,
          hours,
          examDate,
          availabilityDays,
          intensity,
          confidenceBySubject,
        });
      } catch (error) {
        console.error("Failed to save revision form state", error);
      }
    };

    saveFormState();
  }, [
    availabilityDays,
    confidenceBySubject,
    examDate,
    hours,
    intensity,
    isHydrated,
    subjects,
  ]);

  const exportPDF = async () => {
    if (!plan.valid) {
      return;
    }

    const list = plan.allocations
      .map(
        (item) =>
          `<li><strong>${escapeHtml(item.subject)}</strong>: ${item.hours} hrs/week · ${item.sessions} sessions · ${item.confidence} confidence</li>`,
      )
      .join("");

    const html = `
      <html>
        <body style="font-family: Arial; padding: 40px; color: #111827;">
          <h1>Student Toolkit Revision Plan</h1>
          <p><strong>Exam date:</strong> ${escapeHtml(examDate)}</p>
          <p><strong>Runway:</strong> ${plan.daysRemaining} days (${plan.weeksRemaining} weeks)</p>
          <p><strong>Availability:</strong> ${escapeHtml(availabilityDays)} study days/week</p>
          <p><strong>Weekly study budget:</strong> ${escapeHtml(hours)} hours</p>
          <p><strong>Readiness score:</strong> ${plan.readinessScore}/100</p>
          <p><strong>Recommended session:</strong> ${plan.recommendedSessionMinutes} minutes</p>
          <h2>Confidence-weighted allocation</h2>
          <ul>${list}</ul>
          <p style="margin-top:20px; font-size:12px; color:#6b7280;">
            15% of weekly time is reserved for recall, review and catch-up.
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
        <Text style={styles.title}>Adaptive Revision Scheduler</Text>
        <Text style={styles.subtitle}>
          Build a realistic weekly plan from your exam deadline, available study days, and confidence in each subject.
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Readiness</Text>
            <Text style={styles.heroStatValue}>{plan.readinessScore}/100</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Exam runway</Text>
            <Text style={styles.heroStatValue}>
              {plan.daysRemaining !== null && plan.daysRemaining > 0 ? `${plan.daysRemaining}d` : "-"}
            </Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Sessions</Text>
            <Text style={styles.heroStatValue}>{plan.valid ? plan.sessionsPerWeek : "-"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>1. Revision inputs</Text>
        <Text style={styles.helperText}>Comma-separate the subjects you want the scheduler to balance.</Text>

        <TextInput
          placeholder="Algorithms, Databases, Cloud Computing"
          placeholderTextColor={COLORS.textMuted}
          value={subjects}
          style={styles.input}
          onChangeText={setSubjects}
        />

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Exam date (YYYY-MM-DD)"
            placeholderTextColor={COLORS.textMuted}
            value={examDate}
            style={[styles.input, styles.flexInput]}
            onChangeText={setExamDate}
          />
          <TextInput
            placeholder="Hours/week"
            placeholderTextColor={COLORS.textMuted}
            value={hours}
            style={[styles.input, styles.shortInput]}
            keyboardType="numeric"
            onChangeText={setHours}
          />
        </View>

        <TextInput
          placeholder="Available study days per week (1-7)"
          placeholderTextColor={COLORS.textMuted}
          value={availabilityDays}
          style={styles.input}
          keyboardType="numeric"
          onChangeText={setAvailabilityDays}
        />

        <Text style={styles.fieldLabel}>Intensity</Text>
        <View style={styles.intensityRow}>
          {(["light", "balanced", "intensive"] as const).map((option) => (
            <TouchableOpacity
              key={option}
              activeOpacity={0.8}
              style={[styles.intensityButton, intensity === option ? styles.active : null]}
              onPress={() => setIntensity(option)}
            >
              <Text style={[styles.choiceText, intensity === option ? styles.choiceTextActive : null]}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {subjectArray.length > 0 ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>2. Confidence by subject</Text>
          <Text style={styles.helperText}>
            Lower-confidence subjects automatically receive a larger share of your available revision time.
          </Text>

          <View style={styles.confidenceList}>
            {subjectArray.map((subject) => (
              <View key={subject} style={styles.confidenceRow}>
                <Text style={styles.subjectName}>{subject}</Text>
                <View style={styles.confidenceButtons}>
                  {confidenceOptions.map((option) => {
                    const selected = (confidenceBySubject[subject] ?? "medium") === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.8}
                        style={[styles.confidenceButton, selected ? styles.active : null]}
                        onPress={() =>
                          setConfidenceBySubject((current) => ({
                            ...current,
                            [subject]: option.value,
                          }))
                        }
                      >
                        <Text style={[styles.choiceText, selected ? styles.choiceTextActive : null]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.preview}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.previewTitle}>3. Generated weekly plan</Text>
            <Text style={styles.helperText}>
              Deadline urgency, weekly availability and confidence all influence the schedule.
            </Text>
          </View>
          {plan.valid ? <Text style={styles.readyBadge}>Ready</Text> : <Text style={styles.draftBadge}>Needs input</Text>}
        </View>

        {plan.valid ? (
          <>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Focused revision</Text>
                <Text style={styles.summaryValue}>{plan.focusHours}h</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Review buffer</Text>
                <Text style={styles.summaryValue}>{plan.reviewBufferHours}h</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Session length</Text>
                <Text style={styles.summaryValue}>{plan.recommendedSessionMinutes}m</Text>
              </View>
            </View>

            <View style={styles.allocationList}>
              {plan.allocations.map((item) => (
                <View key={item.subject} style={styles.allocationCard}>
                  <View style={styles.allocationHeader}>
                    <Text style={styles.allocationTitle}>{item.subject}</Text>
                    <Text style={styles.confidenceTag}>{item.confidence} confidence</Text>
                  </View>
                  <Text style={styles.allocationHours}>{item.hours} hrs/week</Text>
                  <Text style={styles.allocationDetail}>
                    {item.sessions} × ~{plan.recommendedSessionMinutes} min focus sessions
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Add a future exam date, subjects and weekly hours</Text>
            <Text style={styles.emptyStateBody}>
              The scheduler will then produce a confidence-weighted plan and readiness score.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.exportButton, !plan.valid ? styles.exportButtonDisabled : null]}
        onPress={exportPDF}
        disabled={!plan.valid}
      >
        <Text style={styles.exportText}>Export Revision Plan PDF</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) =>
  StyleSheet.create({
    container: {
      padding: SPACING.xxl,
      backgroundColor: COLORS.backgroundAlt,
      flexGrow: 1,
      gap: SPACING.lg,
    },
    heroCard: {
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
      flexWrap: "wrap",
    },
    heroStatCard: {
      flex: 1,
      minWidth: 92,
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
    formCard: {
      padding: SPACING.xl,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: SPACING.xs,
    },
    helperText: {
      color: COLORS.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: SPACING.md,
    },
    fieldLabel: {
      color: COLORS.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: SPACING.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderRadius: RADIUS.sm,
      backgroundColor: COLORS.background,
      color: COLORS.textPrimary,
    },
    inputRow: {
      flexDirection: "row",
      gap: SPACING.sm,
    },
    flexInput: {
      flex: 1,
    },
    shortInput: {
      width: 116,
    },
    intensityRow: {
      flexDirection: "row",
      gap: SPACING.sm,
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
    choiceText: {
      color: COLORS.textSecondary,
      fontWeight: "700",
      fontSize: 12,
    },
    choiceTextActive: {
      color: COLORS.primary,
    },
    confidenceList: {
      gap: SPACING.md,
    },
    confidenceRow: {
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: SPACING.md,
      gap: SPACING.sm,
    },
    subjectName: {
      color: COLORS.textPrimary,
      fontWeight: "800",
    },
    confidenceButtons: {
      flexDirection: "row",
      gap: SPACING.sm,
    },
    confidenceButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surfaceMuted,
      borderRadius: RADIUS.sm,
      paddingVertical: SPACING.sm,
      alignItems: "center",
    },
    preview: {
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
    previewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: SPACING.md,
      alignItems: "flex-start",
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: "800",
      marginBottom: SPACING.xs,
      color: COLORS.textPrimary,
    },
    readyBadge: {
      backgroundColor: COLORS.successSoft,
      color: COLORS.success,
      borderRadius: 999,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      fontSize: 11,
      fontWeight: "800",
      overflow: "hidden",
    },
    draftBadge: {
      backgroundColor: COLORS.surfaceMuted,
      color: COLORS.textMuted,
      borderRadius: 999,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      fontSize: 11,
      fontWeight: "800",
      overflow: "hidden",
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    summaryItem: {
      flex: 1,
      minWidth: 100,
      backgroundColor: COLORS.surfaceMuted,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
    },
    summaryLabel: {
      color: COLORS.textMuted,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 4,
    },
    summaryValue: {
      color: COLORS.textPrimary,
      fontSize: 20,
      fontWeight: "800",
    },
    allocationList: {
      marginTop: SPACING.lg,
      gap: SPACING.sm,
    },
    allocationCard: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      backgroundColor: COLORS.background,
    },
    allocationHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: SPACING.sm,
    },
    allocationTitle: {
      color: COLORS.textPrimary,
      fontWeight: "800",
      flex: 1,
    },
    confidenceTag: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    allocationHours: {
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginTop: SPACING.xs,
    },
    allocationDetail: {
      color: COLORS.textMuted,
      fontSize: 12,
      marginTop: 3,
    },
    emptyState: {
      marginTop: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      padding: SPACING.lg,
      backgroundColor: COLORS.surfaceMuted,
    },
    emptyStateTitle: {
      color: COLORS.textPrimary,
      fontWeight: "800",
      marginBottom: SPACING.xs,
    },
    emptyStateBody: {
      color: COLORS.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    exportButton: {
      backgroundColor: COLORS.primary,
      padding: SPACING.xl,
      borderRadius: RADIUS.sm,
      alignItems: "center",
      marginBottom: SPACING.xxl,
    },
    exportButtonDisabled: {
      opacity: 0.45,
    },
    exportText: {
      color: COLORS.white,
      fontWeight: "800",
    },
  });
