import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemedStyles, type AppThemeTokens } from "../../context/theme";

export type TodayPriority = {
  id: string;
  label: string;
  detail: string;
  href: string;
  meta?: string;
};

type Props = {
  primaryFocus: string;
  priorities: TodayPriority[];
  habitsDone: number;
  habitsTotal: number;
  nearestDeadlineLabel?: string | null;
  nearestDeadlineDays?: number | null;
  onOpen: (href: string) => void;
};

export default function TodayCommandCenter({
  primaryFocus,
  priorities,
  habitsDone,
  habitsTotal,
  nearestDeadlineLabel,
  nearestDeadlineDays,
  onOpen,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const habitsRemaining = Math.max(0, habitsTotal - habitsDone);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Today</Text>
          <Text style={styles.title}>Your next three moves</Text>
          <Text style={styles.subtitle}>
            {primaryFocus
              ? `Current focus: ${primaryFocus}`
              : "Priorities are ranked from your lowest-scoring areas and current habit progress."}
          </Text>
        </View>
        <View style={styles.habitPill}>
          <Text style={styles.habitPillValue}>
            {habitsDone}/{habitsTotal || 0}
          </Text>
          <Text style={styles.habitPillLabel}>habits</Text>
        </View>
      </View>

      <View style={styles.signalRow}>
        <View style={styles.signalCard}>
          <Text style={styles.signalLabel}>Habit status</Text>
          <Text style={styles.signalValue}>
            {habitsTotal === 0
              ? "No habits"
              : habitsRemaining === 0
                ? "Complete"
                : `${habitsRemaining} remaining`}
          </Text>
        </View>
        <View style={styles.signalCard}>
          <Text style={styles.signalLabel}>Nearest deadline</Text>
          <Text style={styles.signalValue}>
            {nearestDeadlineLabel
              ? `${nearestDeadlineLabel} · ${
                  nearestDeadlineDays === null || nearestDeadlineDays === undefined
                    ? "date check"
                    : nearestDeadlineDays < 0
                      ? `${Math.abs(nearestDeadlineDays)}d overdue`
                      : nearestDeadlineDays === 0
                        ? "today"
                        : `${nearestDeadlineDays}d`
                }`
              : "Not set"}
          </Text>
        </View>
      </View>

      <View style={styles.priorityList}>
        {priorities.slice(0, 3).map((priority, index) => (
          <TouchableOpacity
            key={priority.id}
            activeOpacity={0.84}
            style={styles.priorityCard}
            onPress={() => onOpen(priority.href)}
          >
            <View style={styles.priorityNumber}>
              <Text style={styles.priorityNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.priorityCopy}>
              <View style={styles.priorityTitleRow}>
                <Text style={styles.priorityTitle}>{priority.label}</Text>
                {priority.meta ? <Text style={styles.priorityMeta}>{priority.meta}</Text> : null}
              </View>
              <Text style={styles.priorityDetail}>{priority.detail}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.quickButton}
          onPress={() => onOpen("/revision")}
        >
          <Text style={styles.quickButtonText}>Plan revision</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.quickButton}
          onPress={() => onOpen("/habits")}
        >
          <Text style={styles.quickButtonText}>Check habits</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.quickButton}
          onPress={() => onOpen("/weekly-review")}
        >
          <Text style={styles.quickButtonText}>Review week</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) =>
  StyleSheet.create({
    card: {
      marginTop: SPACING.xxl,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.card,
      backgroundColor: COLORS.card,
      padding: SPACING.xxl,
      shadowColor: COLORS.black,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: SPACING.md,
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.9,
      marginBottom: SPACING.xs,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: 21,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    subtitle: {
      color: COLORS.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: SPACING.xs,
    },
    habitPill: {
      minWidth: 66,
      alignItems: "center",
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surfaceMuted,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    habitPillValue: {
      color: COLORS.textPrimary,
      fontWeight: "800",
      fontSize: 18,
    },
    habitPillLabel: {
      color: COLORS.textMuted,
      fontWeight: "700",
      fontSize: 10,
      textTransform: "uppercase",
    },
    signalRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: SPACING.lg,
      flexWrap: "wrap",
    },
    signalCard: {
      flex: 1,
      minWidth: 130,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surfaceMuted,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    signalLabel: {
      color: COLORS.textMuted,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    signalValue: {
      marginTop: 4,
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: "800",
    },
    priorityList: {
      gap: SPACING.sm,
      marginTop: SPACING.lg,
    },
    priorityCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
    },
    priorityNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primarySoft,
    },
    priorityNumberText: {
      color: COLORS.primary,
      fontWeight: "800",
      fontSize: 12,
    },
    priorityCopy: {
      flex: 1,
    },
    priorityTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: SPACING.sm,
      alignItems: "center",
    },
    priorityTitle: {
      flex: 1,
      color: COLORS.textPrimary,
      fontWeight: "800",
      fontSize: 14,
    },
    priorityMeta: {
      color: COLORS.primary,
      fontWeight: "800",
      fontSize: 11,
    },
    priorityDetail: {
      color: COLORS.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    chevron: {
      color: COLORS.textMuted,
      fontSize: 22,
      fontWeight: "700",
    },
    quickActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.sm,
      marginTop: SPACING.lg,
    },
    quickButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surfaceMuted,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    quickButtonText: {
      color: COLORS.textPrimary,
      fontSize: 11,
      fontWeight: "800",
    },
  });
