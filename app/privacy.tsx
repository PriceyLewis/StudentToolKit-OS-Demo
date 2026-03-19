import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemedStyles, type AppThemeTokens } from "../context/theme";

const LAST_UPDATED = "2026-02-19";

export default function PrivacyScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.meta}>Last updated: {LAST_UPDATED}</Text>

      <Section title="1. Data stored on your device" styles={styles}>
        We store your profile name, score targets, planner scores, habit entries, weekly review inputs,
        notification preferences so the app can function.
      </Section>

      <Section title="2. Where data is stored" styles={styles}>
        Data is stored locally on your phone using AsyncStorage. Your data stays on your device unless you
        choose to export a local backup file.
      </Section>

      <Section title="3. What we do not do" styles={styles}>
        We do not run backend servers for your personal app data. We do not collect personal data, sell
        personal data, or use third-party analytics for your local entries.
      </Section>

      <Section title="4. Features in this release" styles={styles}>
        All features in this version are available to every user.
      </Section>

      <Section title="5. Your controls" styles={styles}>
        You can reset local data in the app settings and uninstall the app at any time. You can also export
        or restore your local backup JSON file.
      </Section>

      <Section title="6. Changes to this policy" styles={styles}>
        We may update this policy when features change. The Last updated date above shows the latest
        version.
      </Section>

      <Section title="7. Contact" styles={styles}>
        Email: studenttoolkithelp@gmail.com
      </Section>

      <Section title="8. Public policy URLs" styles={styles}>
        Privacy Policy URL: https://github.com/PriceyLewis/StudentToolKit-OS/blob/main/docs/privacy-policy.md{"\n"}
        Terms of Use URL: https://github.com/PriceyLewis/StudentToolKit-OS/blob/main/docs/terms-of-use.md
      </Section>
    </ScrollView>
  );
}

type SectionProps = {
  title: string;
  children: ReactNode;
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


