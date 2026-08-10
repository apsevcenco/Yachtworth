/**
 * Yachtworth — luxury minimalism
 * Deep navy + champagne gold.
 */

const navy = "#0B1E3F";
const navyDeep = "#081530";
const navyElev = "#142A52";
const gold = "#C9A961";
const goldSoft = "#E4CB94";
const ivory = "#F7F3EC";
const acidBlack = "#05060B";
const acidPanel = "#101126";
const acidLime = "#B6FF00";
const acidCyan = "#00F5FF";
const acidCoral = "#FF3D81";

const colors = {
  light: {
    text: navy,
    tint: gold,

    background: ivory,
    foreground: navy,

    card: "#FFFFFF",
    cardForeground: navy,

    primary: gold,
    primaryForeground: navy,

    secondary: navy,
    secondaryForeground: ivory,

    muted: "#EFE9DE",
    mutedForeground: "#6B6253",

    accent: gold,
    accentForeground: navy,

    destructive: "#B0413E",
    destructiveForeground: "#FFFFFF",

    border: "#E2D9C7",
    input: "#E2D9C7",
  },

  dark: {
    text: ivory,
    tint: gold,

    background: navy,
    foreground: ivory,

    card: navyElev,
    cardForeground: ivory,

    primary: gold,
    primaryForeground: navy,

    secondary: navyDeep,
    secondaryForeground: ivory,

    muted: navyElev,
    mutedForeground: "#8A93A6",

    accent: goldSoft,
    accentForeground: navy,

    destructive: "#E36B68",
    destructiveForeground: "#FFFFFF",

    border: "#1E3461",
    input: "#1E3461",
  },

  acid: {
    text: "#F6FFF4",
    tint: acidLime,

    background: acidBlack,
    foreground: "#F6FFF4",

    card: acidPanel,
    cardForeground: "#F6FFF4",

    primary: acidLime,
    primaryForeground: acidBlack,

    secondary: "#171B39",
    secondaryForeground: "#F6FFF4",

    muted: "#191B32",
    mutedForeground: "rgba(246,255,244,0.68)",

    accent: acidCyan,
    accentForeground: acidBlack,

    destructive: acidCoral,
    destructiveForeground: "#FFFFFF",

    border: "rgba(0,245,255,0.26)",
    input: "rgba(0,245,255,0.20)",

    neon: acidLime,
    neonAlt: acidCyan,
    hot: acidCoral,
    violet: "#8F5CFF",
    glow: "rgba(182,255,0,0.22)",
  },

  radius: 14,
};

export default colors;
