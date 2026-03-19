import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { HabitCategory, HabitDifficulty, useHabits } from "../../context/HabitContext";
import { useTheme, useThemedStyles, type AppThemeTokens } from "../../context/theme";

const CATEGORIES: HabitCategory[] = ["academic", "fitness", "hustle", "career"];
const DIFFICULTIES: HabitDifficulty[] = ["easy", "medium", "hard"];

const toCategoryLabel = (category: HabitCategory) =>
  category.charAt(0).toUpperCase() + category.slice(1);
const toDifficultyLabel = (difficulty: HabitDifficulty) =>
  difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

export default function HabitsScreen() {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { habits, addHabit, updateHabit, removeHabit } = useHabits();
  const sortedHabits = useMemo(() => [...habits], [habits]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Manage Habits</Text>
      <Text style={styles.subtitle}>Create, edit, categorize, and archive habits.</Text>

      <TouchableOpacity activeOpacity={0.8} style={styles.addButton} onPress={addHabit}>
        <Text style={styles.addButtonText}>Add Habit</Text>
      </TouchableOpacity>

      <View style={styles.list}>
        {sortedHabits.map((habit) => (
          <View key={habit.id} style={[styles.itemCard, !habit.active ? styles.itemInactive : null]}>
            <TextInput
              value={habit.title}
              onChangeText={(text) => updateHabit(habit.id, { title: text })}
              placeholder="Habit title"
              placeholderTextColor={COLORS.textSubtle}
              style={styles.input}
            />

            <View style={styles.categoryRow}>
              {CATEGORIES.map((category) => {
                const isSelected = habit.category === category;
                return (
                  <TouchableOpacity
                    key={category}
                    activeOpacity={0.8}
                    style={[styles.categoryPill, isSelected ? styles.categoryPillActive : null]}
                    onPress={() => updateHabit(habit.id, { category })}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected ? styles.categoryPillTextActive : null,
                      ]}
                    >
                      {toCategoryLabel(category)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.difficultyRow}>
              <Text style={styles.difficultyLabel}>Difficulty</Text>
              <View style={styles.categoryRow}>
                {DIFFICULTIES.map((difficulty) => {
                  const isSelected = (habit.difficulty ?? "medium") === difficulty;
                  return (
                    <TouchableOpacity
                      key={difficulty}
                      activeOpacity={0.8}
                      style={[styles.categoryPill, isSelected ? styles.difficultyPillActive : null]}
                      onPress={() => updateHabit(habit.id, { difficulty })}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected ? styles.categoryPillTextActive : null,
                        ]}
                      >
                        {toDifficultyLabel(difficulty)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.actionsRow}>
              {habit.active ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.removeButton}
                  onPress={() => removeHabit(habit.id)}
                >
                  <Text style={styles.removeButtonText}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.restoreButton}
                  onPress={() => updateHabit(habit.id, { active: true })}
                >
                  <Text style={styles.restoreButtonText}>Restore</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) => StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    backgroundColor: COLORS.backgroundAlt,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    color: COLORS.textMuted,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.input,
    alignItems: "center",
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  list: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  itemCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  itemInactive: {
    opacity: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  categoryPill: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  categoryPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EEF2FF",
  },
  categoryPillText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryPillTextActive: {
    color: COLORS.primary,
  },
  difficultyRow: {
    gap: SPACING.xs,
  },
  difficultyLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  difficultyPillActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successSoft,
  },
  actionsRow: {
    alignItems: "flex-end",
  },
  removeButton: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  removeButtonText: {
    color: COLORS.danger,
    fontWeight: "700",
  },
  restoreButton: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  restoreButtonText: {
    color: COLORS.success,
    fontWeight: "700",
  },
});
