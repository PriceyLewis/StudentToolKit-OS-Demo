import { useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useHabits } from "../../context/HabitContext";
import { PerformanceContext } from "../../context/PerformanceContext";
import { useTheme, useThemedStyles, type AppThemeTokens } from "../../context/theme";
import { weeklyHabitStats } from "../utils/habitsWeekly";
import {
  computeWeekAverages,
  generateInsights,
  getLast7DaySlices,
} from "../utils/review";

const format = (value: number) => `${Math.round(value)}/100`;

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPastDateKeys = (days: number, endOffsetDays = 0) => {
  const keys: string[] = [];
  for (let i = days - 1 + endOffsetDays; i >= endOffsetDays; i -= 1) {
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - i);
    keys.push(toLocalDateKey(cursor));
  }
  return keys;
};

export default function WeeklyReviewScreen() {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const {
    performanceHistory,
    academicTarget,
    fitnessTarget,
    hustleTarget,
    careerTarget,
  } = useContext(PerformanceContext);
  const { habits, habitCompletion, resetCurrentWeekHabits } = useHabits();
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(10)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsTranslateY = useRef(new Animated.Value(14)).current;
  const overallCount = useRef(new Animated.Value(0)).current;
  const [displayOverall, setDisplayOverall] = useState(0);

  const { lastAvg, prevAvg, insights } = useMemo(() => {
    const { last7, prev7 } = getLast7DaySlices(performanceHistory);
    const nextLastAvg = computeWeekAverages(last7);
    const nextPrevAvg = computeWeekAverages(prev7);

    return {
      lastAvg: nextLastAvg,
      prevAvg: nextPrevAvg,
      insights: generateInsights(nextLastAvg, nextPrevAvg),
    };
  }, [performanceHistory]);

  const rows = [
    { label: "Overall", current: lastAvg.overall, previous: prevAvg.overall },
    { label: "Academic", current: lastAvg.academic, previous: prevAvg.academic },
    { label: "Physical", current: lastAvg.fitness, previous: prevAvg.fitness },
    { label: "Income", current: lastAvg.hustle, previous: prevAvg.hustle },
    { label: "Professional", current: lastAvg.career, previous: prevAvg.career },
  ];
  const weekly = useMemo(
    () => weeklyHabitStats(habits, habitCompletion, 7),
    [habitCompletion, habits]
  );
  const activeHabits = useMemo(() => habits.filter((habit) => habit.active), [habits]);
  const hasEnoughPerformanceData = performanceHistory.length >= 2;
  const hasAnyPerformanceData = performanceHistory.length > 0;
  const hasHabits = activeHabits.length > 0;
  const deepInsights = useMemo(() => {
    const pick = (label: string, current: number, previous: number) => ({
      label,
      delta: current - previous,
    });
    const entries = [
      pick("Academic", lastAvg.academic, prevAvg.academic),
      pick("Physical", lastAvg.fitness, prevAvg.fitness),
      pick("Income", lastAvg.hustle, prevAvg.hustle),
      pick("Professional", lastAvg.career, prevAvg.career),
    ];
    const sorted = [...entries].sort((a, b) => b.delta - a.delta);
    return {
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
    };
  }, [lastAvg, prevAvg]);
  const smartInsights = useMemo(() => {
    const nextInsights: string[] = [];

    const formatPercentDelta = (current: number, previous: number) => {
      if (previous <= 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 100);
    };

    const hustlePctDelta = formatPercentDelta(lastAvg.hustle, prevAvg.hustle);
    if (hustlePctDelta >= 10) {
      nextInsights.push(
        `You improved Hustle by ${hustlePctDelta}% this week \uD83D\uDD25`
      );
    } else if (hustlePctDelta <= -10) {
      nextInsights.push(`Hustle dropped ${Math.abs(hustlePctDelta)}% this week. Protect one daily income action.`);
    }

    const academicDelta = Math.round(lastAvg.academic - prevAvg.academic);
    if (academicDelta >= 2) {
      nextInsights.push("Academic focus is trending upward.");
    } else if (academicDelta <= -2) {
      nextInsights.push("Academic focus dipped this week. Tighten your first study block.");
    }

    const fitnessHabitIds = activeHabits
      .filter((habit) => habit.category === "fitness")
      .map((habit) => habit.id);
    if (fitnessHabitIds.length > 0) {
      const countCompletedDays = (dateKeys: string[]) =>
        dateKeys.reduce((count, key) => {
          const day = habitCompletion[key] || {};
          const anyFitnessDone = fitnessHabitIds.some((id) => !!day[id]);
          return count + (anyFitnessDone ? 1 : 0);
        }, 0);

      const last7Keys = getPastDateKeys(7, 0);
      const prev7Keys = getPastDateKeys(7, 7);
      const fitnessDaysLast = countCompletedDays(last7Keys);
      const fitnessDaysPrev = countCompletedDays(prev7Keys);
      const fitnessDayDelta = fitnessDaysLast - fitnessDaysPrev;

      if (fitnessDayDelta <= -1) {
        nextInsights.push(
          `Your Fitness consistency dropped ${Math.abs(fitnessDayDelta)} day${Math.abs(fitnessDayDelta) === 1 ? "" : "s"}.`
        );
      } else if (fitnessDayDelta >= 1) {
        nextInsights.push(
          `Fitness consistency improved by ${fitnessDayDelta} day${fitnessDayDelta === 1 ? "" : "s"}.`
        );
      }
    }

    const overallDelta = Math.round(lastAvg.overall - prevAvg.overall);
    if (overallDelta >= 3) {
      nextInsights.push(`Overall momentum is up ${overallDelta} points vs last week.`);
    } else if (overallDelta <= -3) {
      nextInsights.push(`Overall momentum is down ${Math.abs(overallDelta)} points. Focus on your lowest area first.`);
    }

    if (nextInsights.length === 0) {
      nextInsights.push("Consistency is stable this week. One stronger daily block will create momentum.");
    }

    return nextInsights.slice(0, 4);
  }, [activeHabits, habitCompletion, lastAvg, prevAvg]);
  const combinedInsights = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];

    [...smartInsights, ...insights].forEach((item) => {
      if (seen.has(item)) {
        return;
      }
      seen.add(item);
      merged.push(item);
    });

    return merged.slice(0, 6);
  }, [insights, smartInsights]);
  const weeklyGrade = useMemo(() => {
    const targetCaps = {
      academic: Math.min(academicTarget * 10, 100),
      fitness: Math.min(fitnessTarget * 20, 100),
      hustle: Math.min(hustleTarget * 10, 100),
      career: Math.min(careerTarget, 100),
    };
    const targetProgressScore = Math.round(
      ([
        lastAvg.academic / Math.max(1, targetCaps.academic),
        lastAvg.fitness / Math.max(1, targetCaps.fitness),
        lastAvg.hustle / Math.max(1, targetCaps.hustle),
        lastAvg.career / Math.max(1, targetCaps.career),
      ].reduce((sum, ratio) => sum + Math.max(0, Math.min(1, ratio)), 0) /
        4) *
        100
    );
    const improvementDelta = Math.round(lastAvg.overall - prevAvg.overall);
    const improvementScore = Math.max(0, Math.min(100, 50 + improvementDelta * 8));
    const numeric = Math.round(weekly.pct * 0.45 + targetProgressScore * 0.35 + improvementScore * 0.2);

    let letter = "F";
    if (numeric >= 97) letter = "A+";
    else if (numeric >= 93) letter = "A";
    else if (numeric >= 90) letter = "A-";
    else if (numeric >= 87) letter = "B+";
    else if (numeric >= 83) letter = "B";
    else if (numeric >= 80) letter = "B-";
    else if (numeric >= 77) letter = "C+";
    else if (numeric >= 73) letter = "C";
    else if (numeric >= 70) letter = "C-";
    else if (numeric >= 67) letter = "D+";
    else if (numeric >= 63) letter = "D";
    else if (numeric >= 60) letter = "D-";

    return {
      letter,
      numeric,
      targetProgressScore,
      improvementDelta,
    };
  }, [academicTarget, careerTarget, fitnessTarget, hustleTarget, lastAvg, prevAvg, weekly.pct]);

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(cardsTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [cardsOpacity, cardsTranslateY, headerOpacity, headerTranslateY]);

  useEffect(() => {
    const sub = overallCount.addListener(({ value }) => {
      setDisplayOverall(Math.round(value));
    });
    return () => {
      overallCount.removeListener(sub);
    };
  }, [overallCount]);

  useEffect(() => {
    Animated.timing(overallCount, {
      toValue: Math.round(lastAvg.overall),
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [lastAvg.overall, overallCount]);

  return (
    <ScrollView contentContainerStyle={[styles.container, isCompact ? styles.containerCompact : null]}>
      <Animated.View
        style={{
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <Text style={[styles.title, isCompact ? styles.titleCompact : null]}>Weekly Review</Text>
        <Text style={styles.subtitle}>Last 7 days compared to the previous 7 days</Text>
        <View style={[styles.heroCard, isCompact ? styles.heroCardCompact : null]}>
          <Text style={styles.heroLabel}>Weekly Momentum</Text>
          <Text style={[styles.heroValue, isCompact ? styles.heroValueCompact : null]}>
            {displayOverall}/100
          </Text>
          <Text style={styles.heroSubtle}>
            {Math.round(lastAvg.overall - prevAvg.overall) >= 0 ? "+" : ""}
            {Math.round(lastAvg.overall - prevAvg.overall)} vs previous week
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: cardsOpacity,
          transform: [{ translateY: cardsTranslateY }],
        }}
      >
      {!hasAnyPerformanceData ? (
        <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
          <Text style={styles.sectionTitle}>No review data yet</Text>
          <Text style={styles.insightText}>
            Start logging progress this week to unlock your weekly comparison and coaching insights.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => router.push("/revision" as any)}
          >
            <Text style={styles.primaryButtonText}>Log first update</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.sectionTitle}>Score Breakdown</Text>
        {hasEnoughPerformanceData ? (
          rows.map((row) => {
            const diff = row.current - row.previous;
            const trend = diff > 0 ? `+${Math.round(diff)}` : `${Math.round(diff)}`;
            const trendColor =
              diff > 0 ? COLORS.success : diff < 0 ? COLORS.danger : COLORS.textMuted;

            return (
              <View key={row.label} style={styles.metricRow}>
                <View>
                  <Text style={styles.metricLabel}>{row.label}</Text>
                  <Text style={styles.metricScores}>
                    {format(row.current)} vs {format(row.previous)}
                  </Text>
                </View>
                <Text style={[styles.metricTrend, { color: trendColor }]}>{trend}</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Need one more check-in</Text>
            <Text style={styles.insightText}>
              Log one more day to compare this week against last week with trend deltas.
            </Text>
          </View>
        )}
      </View>

        <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
          <Text style={styles.sectionTitle}>Smart Insights</Text>
          {combinedInsights.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Insights are warming up</Text>
              <Text style={styles.insightText}>
                Keep logging daily updates and we will generate tailored weekly insights.
              </Text>
            </View>
          ) : (
            combinedInsights.map((insight) => (
              <Text key={insight} style={styles.insightText}>
                {`\u2022`} {insight}
              </Text>
            ))
          )}
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.sectionTitle}>Habit Consistency (7d)</Text>
        {hasHabits ? (
          <>
            <Text style={styles.insightText}>Overall: {weekly.pct}%</Text>
            <Text style={styles.insightText}>Academic: {weekly.pctByCat.academic}%</Text>
            <Text style={styles.insightText}>Fitness: {weekly.pctByCat.fitness}%</Text>
            <Text style={styles.insightText}>Hustle: {weekly.pctByCat.hustle}%</Text>
            <Text style={styles.insightText}>Career: {weekly.pctByCat.career}%</Text>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No active habits yet</Text>
            <Text style={styles.insightText}>Add your first habit to build momentum.</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.secondaryButton}
              onPress={() => router.push("/habits" as any)}
            >
              <Text style={styles.secondaryButtonText}>Add habits</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.resetWeekButton}
          onPress={() =>
            Alert.alert("Start Fresh Week?", "This clears habit check-offs for the current week only.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Start Fresh",
                style: "destructive",
                onPress: () => {
                  resetCurrentWeekHabits().catch(() => {
                    Alert.alert("Could not reset week", "Please try again.");
                  });
                },
              },
            ])
          }
        >
          <Text style={styles.resetWeekButtonText}>Start Fresh Week</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.sectionTitle}>Weekly Grade</Text>
        <Text style={styles.gradeValue}>Your Week Grade: {weeklyGrade.letter}</Text>
        <Text style={styles.insightText}>Composite score: {weeklyGrade.numeric}/100</Text>
        <Text style={styles.insightText}>Habit consistency: {weekly.pct}%</Text>
        <Text style={styles.insightText}>
          Target progress: {weeklyGrade.targetProgressScore}% | Improvement: {weeklyGrade.improvementDelta >= 0 ? "+" : ""}
          {weeklyGrade.improvementDelta}
        </Text>
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.sectionTitle}>Deep Insights</Text>
        <Text style={styles.insightText}>
          Strongest improvement: {deepInsights.strongest.label} (
          {Math.round(deepInsights.strongest.delta) >= 0 ? "+" : ""}
          {Math.round(deepInsights.strongest.delta)})
        </Text>
        <Text style={styles.insightText}>
          Biggest drag: {deepInsights.weakest.label} (
          {Math.round(deepInsights.weakest.delta) >= 0 ? "+" : ""}
          {Math.round(deepInsights.weakest.delta)})
        </Text>
        <Text style={styles.insightText}>
          Priority next week: raise the lowest momentum area before scaling others.
        </Text>
      </View>
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) => StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    backgroundColor: COLORS.backgroundAlt,
    flexGrow: 1,
  },
  containerCompact: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: COLORS.textPrimary,
  },
  titleCompact: {
    fontSize: 28,
  },
  subtitle: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xxl,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardCompact: {
    padding: SPACING.lg,
  },
  heroCard: {
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroCardCompact: {
    padding: SPACING.lg,
  },
  heroLabel: {
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  heroValue: {
    marginTop: SPACING.xs,
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  heroValueCompact: {
    fontSize: 26,
  },
  heroSubtle: {
    marginTop: SPACING.xs,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  gradeValue: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 24,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  metricLabel: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  metricScores: {
    marginTop: SPACING.xs,
    color: COLORS.textMuted,
    fontSize: 12,
  },
  metricTrend: {
    fontWeight: "700",
  },
  insightText: {
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  emptyStateTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  resetWeekButton: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
  },
  resetWeekButtonText: {
    color: COLORS.danger,
    fontWeight: "700",
  },
});
