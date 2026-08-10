import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import colors from "@/constants/colors";

export type AppThemeId = "classic" | "acid" | "mediterranean";

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
    description: "Black and ultraviolet base with toxic lime, magenta, orange and coral accents.",
  },
  {
    id: "mediterranean",
    label: "Mediterranean",
    description: "Light sea-mist interface with turquoise, white foam, sand and coral accents.",
  },
];

type ThemeContextValue = {
  themeId: AppThemeId;
  setThemeId: (theme: AppThemeId) => Promise<void>;
  colors: Palette & { radius: number };
  isAcid: boolean;
  isMediterranean: boolean;
  loaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(value: string | null): value is AppThemeId {
  return value === "classic" || value === "acid" || value === "mediterranean";
}

function paletteFor(themeId: AppThemeId): Palette {
  if (themeId === "acid") return colors.acid;
  if (themeId === "mediterranean") return colors.mediterranean;
  return colors.dark;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
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
    const palette = paletteFor(themeId);
    return {
      themeId,
      setThemeId,
      colors: { ...palette, radius: colors.radius },
      isAcid: themeId === "acid",
      isMediterranean: themeId === "mediterranean",
      loaded,
    };
  }, [loaded, themeId]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    const fallback = paletteFor("classic");
    return {
      themeId: "classic" as const,
      setThemeId: async () => {},
      colors: { ...fallback, radius: colors.radius },
      isAcid: false,
      isMediterranean: false,
      loaded: true,
    };
  }
  return context;
}

export function useColors() {
  return useTheme().colors;
}
