import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState, useContext } from "react";
import { ProfileContext } from "../context/ProfileContext";
import { useRouter } from "expo-router";
import { useTheme, useThemedStyles, type AppThemeTokens } from "../context/theme";

export default function Onboarding() {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const { completeOnboarding } = useContext(ProfileContext);
  const router = useRouter();

  const handleContinue = () => {
    completeOnboarding(name, focus);
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowPrimary} />
      <View style={styles.glowSecondary} />

      <View style={styles.heroPanel}>
        <View style={styles.badgeRow}>
          <Text style={styles.eyebrow}>Student Toolkit OS</Text>
          <View style={styles.mockBadge}>
            <Text style={styles.mockBadgeText}>Portfolio Mock</Text>
          </View>
        </View>

        <Text style={styles.title}>Build a sharper weekly system.</Text>
        <Text style={styles.subtitle}>
          Plan exams, training, habits, income goals, and career progress from one polished local-first dashboard.
        </Text>

        <View style={styles.featureRow}>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>Planning</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>Analytics</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>Exports</Text>
          </View>
        </View>

        <TextInput
          placeholder="Your name"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Primary focus, e.g. exams, fitness, freelance work"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          value={focus}
          onChangeText={setFocus}
        />

        <TouchableOpacity activeOpacity={0.8} style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Enter Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) => StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.screenWide,
    justifyContent: "center",
    backgroundColor: COLORS.backgroundAlt,
    overflow: "hidden",
  },
  glowPrimary: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.primarySoft,
    top: -70,
    right: -80,
    opacity: 0.95,
  },
  glowSecondary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.surfaceMuted,
    bottom: -80,
    left: -70,
    opacity: 0.9,
  },
  heroPanel: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxxl,
    shadowColor: COLORS.black,
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  mockBadge: {
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mockBadgeText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 11,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: SPACING.md,
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.section,
  },
  featurePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  featurePillText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.input,
    borderRadius: RADIUS.button,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xxlPlus,
    borderRadius: RADIUS.button,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
});
