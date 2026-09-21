import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useThemedStyles, type AppThemeTokens } from "../context/theme";

const items = [
  { label: "Dashboard", route: "/dashboard", icon: "⌂" },
  { label: "Plan", route: "/revision", icon: "▤" },
  { label: "Habits", route: "/habits", icon: "✓" },
  { label: "Analytics", route: "/analytics", icon: "↗" },
  { label: "Settings", route: "/settings", icon: "⚙" },
] as const;

export default function AppNavigation({ active = "Dashboard" }: { active?: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);
  const isMobile = width < 700;

  return (
    <View style={[styles.nav, isMobile ? styles.navMobile : null]}>
      {items.map((item) => {
        const selected = item.label === active;
        return (
          <TouchableOpacity
            key={item.label}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={[styles.item, selected ? styles.itemActive : null]}
            onPress={() => router.push(item.route as any)}
          >
            <Text style={[styles.icon, selected ? styles.textActive : null]}>{item.icon}</Text>
            <Text style={[styles.label, selected ? styles.textActive : null]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) =>
  StyleSheet.create({
    nav: {
      flexDirection: "row",
      alignSelf: "center",
      width: "100%",
      maxWidth: 760,
      gap: SPACING.xs,
      padding: SPACING.xs,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.card,
      backgroundColor: COLORS.card,
    },
    navMobile: {
      position: "relative",
      marginBottom: SPACING.sm,
    },
    item: {
      flex: 1,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: RADIUS.md,
      paddingHorizontal: 2,
    },
    itemActive: {
      backgroundColor: COLORS.primarySoft,
    },
    icon: {
      color: COLORS.textMuted,
      fontSize: 16,
      fontWeight: "800",
    },
    label: {
      color: COLORS.textMuted,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 2,
    },
    textActive: {
      color: COLORS.primary,
    },
  });
