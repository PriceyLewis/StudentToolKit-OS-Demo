import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import PerformanceGraph from "../../components/PerformanceGraph";
import { useHabits } from "../../context/HabitContext";
import { PerformanceContext } from "../../context/PerformanceContext";
import { useThemedStyles, type AppThemeTokens } from "../../context/theme";

const lastN = (arr: any[], n: number) => arr.slice(Math.max(0, arr.length - n));

const calcConsistency = (history: any[], days: number) => {
  const slice = lastN(history, days);
  return Math.round((slice.length / days) * 100);
};

const toSeries = (history: any[], key: "academic" | "fitness" | "hustle" | "career") =>
  history.map((h) => ({ date: h.date, value: h[key] }));

const toOverallSeries = (history: any[]) =>
  history.map((h) => ({
    date: h.date,
    value: (h.academic + h.fitness + h.hustle + h.career) / 4,
  }));

const formatPercent = (value: number) => `${Math.max(0, Math.min(100, value))}%`;
const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const lastNLocalDateKeys = (n: number) => {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(toLocalDateKey(d));
  }
  return keys;
};
const difficultyWeight = (difficulty?: string) =>
  difficulty === "hard" ? 2 : difficulty === "easy" ? 1 : 1.5;

export default function AnalyticsScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const { performanceHistory } = useContext(PerformanceContext);
  const { habits, habitCompletion, streakDays } = useHabits();
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(10)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(14)).current;
  const consistency14Count = useRef(new Animated.Value(0)).current;
  const consistency30Count = useRef(new Animated.Value(0)).current;
  const [displayConsistency14, setDisplayConsistency14] = useState(0);
  const [displayConsistency30, setDisplayConsistency30] = useState(0);

  const history30 = useMemo(() => lastN(performanceHistory, 30), [performanceHistory]);
  const overall = useMemo(() => toOverallSeries(history30), [history30]);
  const academic = useMemo(() => toSeries(history30, "academic"), [history30]);
  const fitness = useMemo(() => toSeries(history30, "fitness"), [history30]);
  const hustle = useMemo(() => toSeries(history30, "hustle"), [history30]);
  const career = useMemo(() => toSeries(history30, "career"), [history30]);

  const consistency14 = useMemo(() => calcConsistency(performanceHistory, 14), [performanceHistory]);
  const consistency30 = useMemo(() => calcConsistency(performanceHistory, 30), [performanceHistory]);
  const activeHabits = useMemo(() => habits.filter((habit) => habit.active), [habits]);
  const habit30DateKeys = useMemo(() => lastNLocalDateKeys(30), []);
  const habitConsistency30Series = useMemo(() => {
    return habit30DateKeys.map((dateKey) => {
      const day = habitCompletion[dateKey] || {};
      const totalWeight = activeHabits.reduce((sum, habit) => sum + difficultyWeight(habit.difficulty), 0);
      const doneWeight = activeHabits.reduce(
        (sum, habit) => sum + (day[habit.id] ? difficultyWeight(habit.difficulty) : 0),
        0
      );
      const pct = totalWeight ? Math.round((doneWeight / totalWeight) * 100) : 0;
      return { date: dateKey, value: pct };
    });
  }, [activeHabits, habit30DateKeys, habitCompletion]);
  const habitStreakTimeline = useMemo(
    () =>
      habit30DateKeys.map((dateKey) => {
        const day = habitCompletion[dateKey] || {};
        const completed = activeHabits.filter((habit) => !!day[habit.id]).length;
        const allDone = activeHabits.length > 0 && completed === activeHabits.length;
        const ratio = activeHabits.length > 0 ? completed / activeHabits.length : 0;
        return { dateKey, completed, allDone, ratio };
      }),
    [activeHabits, habit30DateKeys, habitCompletion]
  );
  const bestStreak30 = useMemo(() => {
    let best = 0;
    let current = 0;
    habitStreakTimeline.forEach((day) => {
      if (day.allDone) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    });
    return best;
  }, [habitStreakTimeline]);

  const bestAreaThisMonth = useMemo(() => {
    if (history30.length === 0) return "No entries yet";

    const averages = {
      Academic:
        history30.reduce((total, item) => total + item.academic, 0) / history30.length,
      Fitness:
        history30.reduce((total, item) => total + item.fitness, 0) / history30.length,
      Hustle:
        history30.reduce((total, item) => total + item.hustle, 0) / history30.length,
      Career:
        history30.reduce((total, item) => total + item.career, 0) / history30.length,
    };

    const [name, score] = Object.entries(averages).sort((a, b) => b[1] - a[1])[0];
    return `${name} (${Math.round(score)}/100)`;
  }, [history30]);

  const hasData = history30.length > 1;
  const hasAnyHistory = history30.length > 0;

  useEffect(() => {
    Animated.stagger(90, [
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
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [contentOpacity, contentTranslateY, headerOpacity, headerTranslateY]);

  useEffect(() => {
    const sub14 = consistency14Count.addListener(({ value }) => {
      setDisplayConsistency14(Math.round(value));
    });
    const sub30 = consistency30Count.addListener(({ value }) => {
      setDisplayConsistency30(Math.round(value));
    });
    return () => {
      consistency14Count.removeListener(sub14);
      consistency30Count.removeListener(sub30);
    };
  }, [consistency14Count, consistency30Count]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(consistency14Count, {
        toValue: consistency14,
        duration: 420,
        useNativeDriver: false,
      }),
      Animated.timing(consistency30Count, {
        toValue: consistency30,
        duration: 420,
        useNativeDriver: false,
      }),
    ]).start();
  }, [consistency14, consistency14Count, consistency30, consistency30Count]);

  const content = (
    <>
      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>Overall Trend (Last 30 entries)</Text>
        {hasData ? (
          <PerformanceGraph data={overall} label="Overall Trend" />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No performance history yet</Text>
            <Text style={styles.empty}>Start logging progress to unlock analytics.</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.primaryButton}
              onPress={() => router.push("/revision" as any)}
            >
              <Text style={styles.primaryButtonText}>Log first update</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>Academic</Text>
        {hasData ? (
          <PerformanceGraph data={academic} label="Academic" />
        ) : (
          <Text style={styles.empty}>Need one more update to chart this trend.</Text>
        )}
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>Fitness</Text>
        {hasData ? (
          <PerformanceGraph data={fitness} label="Fitness" />
        ) : (
          <Text style={styles.empty}>Need one more update to chart this trend.</Text>
        )}
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>Hustle</Text>
        {hasData ? (
          <PerformanceGraph data={hustle} label="Hustle" />
        ) : (
          <Text style={styles.empty}>Need one more update to chart this trend.</Text>
        )}
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>Career</Text>
        {hasData ? (
          <PerformanceGraph data={career} label="Career" />
        ) : (
          <Text style={styles.empty}>Need one more update to chart this trend.</Text>
        )}
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>Best Area This Month</Text>
        <Text style={styles.metricValue}>
          {hasAnyHistory ? bestAreaThisMonth : "No entries yet. Start with your first check-in."}
        </Text>
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>Consistency Score</Text>
        <Text style={styles.metricValue}>14-day: {formatPercent(displayConsistency14)}</Text>
        <Text style={styles.metricValue}>30-day: {formatPercent(displayConsistency30)}</Text>
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>30-Day Habit Consistency (Weighted)</Text>
        {activeHabits.length > 0 ? (
          <>
            <PerformanceGraph data={habitConsistency30Series} label="Habit Consistency" />
            <Text style={styles.metricValue}>Current streak: {streakDays}d</Text>
            <Text style={styles.metricValue}>Best perfect streak (30d): {bestStreak30}d</Text>
          </>
        ) : (
          <Text style={styles.empty}>Add habits to unlock the consistency chart.</Text>
        )}
      </View>

      <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
        <Text style={styles.cardTitle}>Streak Timeline (30d)</Text>
        {activeHabits.length > 0 ? (
          <>
            <View style={styles.timelineGrid}>
              {habitStreakTimeline.map((day) => (
                <View
                  key={day.dateKey}
                  style={[
                    styles.timelineCell,
                    day.allDone
                      ? styles.timelineCellPerfect
                      : day.ratio >= 0.6
                        ? styles.timelineCellStrong
                        : day.ratio > 0
                          ? styles.timelineCellPartial
                          : styles.timelineCellMiss,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.empty}>
              Left to right: last 30 days. Green = perfect day, blue = strong day, amber = partial.
            </Text>
          </>
        ) : (
          <Text style={styles.empty}>No active habits yet.</Text>
        )}
      </View>

      <Link href="/weekly-review" asChild>
        <TouchableOpacity activeOpacity={0.8} style={styles.button}>
          <Text style={styles.buttonText}>Open Weekly Review</Text>
        </TouchableOpacity>
      </Link>
    </>
  );

  return (
    <ScrollView contentContainerStyle={[styles.container, isCompact ? styles.containerCompact : null]}>
      <Animated.View
        style={{
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <Text style={[styles.title, isCompact ? styles.titleCompact : null]}>Analytics</Text>
        <Text style={styles.subtitle}>Trends and consistency</Text>
      </Animated.View>
      <Animated.View
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }],
        }}
      >
        {content}
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.backgroundAlt,
    padding: SPACING.xxl,
    gap: SPACING.lg,
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
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.xxl,
    gap: SPACING.sm,
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
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  metricValue: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  timelineGrid: {
    marginTop: SPACING.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  timelineCell: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
  },
  timelineCellPerfect: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  timelineCellStrong: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineCellPartial: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  timelineCellMiss: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
  },
  empty: {
    color: COLORS.textMuted,
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
  button: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.input,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
});
