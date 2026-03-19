import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemedStyles, type AppThemeTokens } from "../context/theme";

const LAST_UPDATED = "2026-02-19";

export default function DisclaimerScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Terms of Use</Text>
      <Text style={styles.meta}>Last updated: {LAST_UPDATED}</Text>

      <Section title="1. Purpose of the app" styles={styles}>
        This app is for personal planning, tracking, and goal setting.
      </Section>

      <Section title="2. No professional advice" styles={styles}>
        Content in the app is for general information only and is not medical, financial, legal, or other
        professional advice.
      </Section>

      <Section title="3. No guarantees" styles={styles}>
        We do not guarantee outcomes, results, grades, income, health changes, or other performance gains.
        Your results depend on your own decisions and actions.
      </Section>

      <Section title="4. User responsibility" styles={styles}>
        You are responsible for how you use this app and for decisions made using its information.
      </Section>

      <Section title="5. App access" styles={styles}>
        This release includes all app features for every user.
      </Section>
    </ScrollView>
  );
}

type SectionProps = {
  title: string;
  children: string;
  styles: ReturnType<typeof createStyles>;
};

function Section({ title, children, styles }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const createStyles = ({ COLORS, SPACING }: AppThemeTokens) => StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    gap: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "700",
  },
  meta: {
    color: COLORS.textMuted,
    marginTop: -SPACING.sm,
  },
  section: {
    gap: SPACING.xs,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  body: {
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});
