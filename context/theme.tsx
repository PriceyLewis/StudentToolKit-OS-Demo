import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setJSON, getJSON } from "../src/utils/storage";

export const SPACING = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 15,
  xxlPlus: 16,
  xxl: 20,
  xxxl: 24,
  screen: 24,
  screenWide: 30,
  card: 20,
  cardLarge: 25,
  input: 14,
  section: 30,
} as const;

export const RADIUS = {
  sm: 8,
  md: 10,
  card: 16,
  button: 12,
} as const;

export type ThemeMode = "clean" | "dark" | "midnight";

const THEME_STORAGE_KEY = "appThemeMode";

type ColorPalette = {
  [K in keyof typeof LIGHT_COLORS_BASE]: string;
};

const LIGHT_COLORS_BASE = {
  background: "#F9FAFB",
  backgroundAlt: "#F3F4F6",
  card: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  primary: "#2563EB",
  primaryLight: "#3B82F6",
  primarySoft: "#DBEAFE",
  success: "#16A34A",
  successSoft: "#DCFCE7",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerText: "#DC2626",
  dangerSoft: "#FEE2E2",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  textSubtle: "#9CA3AF",
  muted: "#6B7280",
  border: "#E5E7EB",
  chip: "#E9ECEF",
  chipActive: "#CED4DA",
  black: "#000000",
  white: "#FFFFFF",
} as const;

const LIGHT_COLORS: ColorPalette = LIGHT_COLORS_BASE;

const DARK_COLORS: ColorPalette = {
  ...LIGHT_COLORS,
  background: "#0F1216",
  backgroundAlt: "#141922",
  card: "#181E27",
  surfaceMuted: "#111823",
  primary: "#60A5FA",
  primaryLight: "#93C5FD",
  primarySoft: "#1E3A5F",
  success: "#22C55E",
  successSoft: "#123322",
  warning: "#F59E0B",
  warningSoft: "#3A2B12",
  danger: "#F87171",
  dangerText: "#FCA5A5",
  dangerSoft: "#3A1717",
  textPrimary: "#F3F4F6",
  textSecondary: "#CDD5DF",
  textMuted: "#AAB3C2",
  textSubtle: "#7D8A9D",
  muted: "#AAB3C2",
  border: "#2B3645",
  chip: "#243041",
  chipActive: "#324257",
  black: "#000000",
  white: "#FFFFFF",
};

const MIDNIGHT_COLORS: ColorPalette = {
  ...DARK_COLORS,
  background: "#071225",
  backgroundAlt: "#0A172E",
  card: "#0F1B33",
  surfaceMuted: "#0B1930",
  primary: "#22D3EE",
  primaryLight: "#67E8F9",
  primarySoft: "#123847",
  textPrimary: "#E7F0FF",
  textSecondary: "#C4D4F1",
  textMuted: "#9FB0D4",
  textSubtle: "#7A8FB8",
  border: "#1E335A",
  chip: "#142746",
  chipActive: "#1E3966",
};

const paletteByMode: Record<ThemeMode, ColorPalette> = {
  clean: LIGHT_COLORS,
  dark: DARK_COLORS,
  midnight: MIDNIGHT_COLORS,
};

type ThemeContextValue = {
  mode: ThemeMode;
  COLORS: ColorPalette;
  SPACING: typeof SPACING;
  RADIUS: typeof RADIUS;
  setMode: (mode: ThemeMode) => void;
};

export type AppThemeTokens = Omit<ThemeContextValue, "mode" | "setMode">;

const ThemeContext = createContext<ThemeContextValue>({
  mode: "clean",
  COLORS: LIGHT_COLORS,
  SPACING,
  RADIUS,
  setMode: () => {},
});

export const COLORS = LIGHT_COLORS;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("clean");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await getJSON<ThemeMode | null>(THEME_STORAGE_KEY, null);
      if (!mounted) return;
      if (stored === "clean" || stored === "dark" || stored === "midnight") {
        setModeState(stored);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    setJSON(THEME_STORAGE_KEY, next);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      COLORS: paletteByMode[mode],
      SPACING,
      RADIUS,
      setMode,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemedStyles<T>(factory: (theme: AppThemeTokens) => T): T {
  const { COLORS: themeColors } = useTheme();
  return useMemo(() => factory({ COLORS: themeColors, SPACING, RADIUS }), [factory, themeColors]);
}
