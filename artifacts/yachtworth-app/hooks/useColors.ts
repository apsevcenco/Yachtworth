import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

export type AppThemeId = "classic" | "acid";

type Palette = typeof colors.dark & {
  neon?: string;
  neonAlt?: string;
  hot?: string;
  violet?: string;
  glow?: string;
};

const STORAGE_KEY = "yachtworth.theme";

export const APP_THEMES: Array<{
  id: AppThemeId;
  label: string;
  description: string;
}> = [
  {
    id: "classic",
    label: "Yachtworth Classic",
    description: "Deep navy, champagne gold and conservative premium styling.",
  },
  {
    id: "acid",
    label: "Acid Marina",
    description: "Black base with neon lime, electric cyan, hot coral and violet accents.",
  },
];

type ThemeContextValue = {
  themeId: AppThemeId;
  setThemeId: (theme: AppThemeId) => Promise<void>;
  colors: Palette & { radius: number };
  isAcid: boolean;
  loaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(value: string | null): value is AppThemeId {
  return value === "classic" || value === "acid";
}

function paletteFor(themeId: AppThemeId, scheme: "light" | "dark" | null | undefined): Palette {
  if (themeId === "acid") return colors.acid;
  return scheme === "dark" ? colors.dark : colors.light;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [themeId, setThemeIdState] = useState<AppThemeId>("classic");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isThemeId(stored)) setThemeIdState(stored);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setThemeId = async (next: AppThemeId) => {
    setThemeIdState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<ThemeContextValue>(() => {
    const palette = paletteFor(themeId, scheme);
    return {
      themeId,
      setThemeId,
      colors: { ...palette, radius: colors.radius },
      isAcid: themeId === "acid",
      loaded,
    };
  }, [loaded, scheme, themeId]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    const fallback = paletteFor("classic", "dark");
    return {
      themeId: "classic" as const,
      setThemeId: async () => {},
      colors: { ...fallback, radius: colors.radius },
      isAcid: false,
      loaded: true,
    };
  }
  return context;
}

export function useColors() {
  return useTheme().colors;
}
