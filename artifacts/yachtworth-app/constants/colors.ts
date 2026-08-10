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
const acidBlack = "#09000F";
const acidPanel = "#1B0028";
const acidLime = "#B6FF00";
const acidCyan = "#FF4FD8";
const acidCoral = "#FF3D81";
const medSea = "#0B8F9C";
const medInk = "#12323A";
const medMist = "#F4FBFA";
const medFoam = "#FFFFFF";
const medSand = "#D9B66F";

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

    secondary: "#2A003D",
    secondaryForeground: "#F6FFF4",

    muted: "#250038",
    mutedForeground: "rgba(246,255,244,0.68)",

    accent: acidCyan,
    accentForeground: acidBlack,

    destructive: acidCoral,
    destructiveForeground: "#FFFFFF",

    border: "rgba(255,79,216,0.32)",
    input: "rgba(255,79,216,0.22)",

    neon: acidLime,
    neonAlt: "#FF8A00",
    hot: acidCoral,
    violet: "#A855FF",
    glow: "rgba(182,255,0,0.20)",
  },

  mediterranean: {
    text: medInk,
    tint: medSea,

    background: medMist,
    foreground: medInk,

    card: medFoam,
    cardForeground: medInk,

    primary: medSea,
    primaryForeground: "#FFFFFF",

    secondary: "#E6F4F3",
    secondaryForeground: medInk,

    muted: "#DDEDEB",
    mutedForeground: "#5F7276",

    accent: medSand,
    accentForeground: medInk,

    destructive: "#C94C4C",
    destructiveForeground: "#FFFFFF",

    border: "#C7DEDC",
    input: "#C7DEDC",

    neon: medSea,
    neonAlt: "#48BFC7",
    hot: "#EF7D64",
    violet: "#7A8BD8",
    glow: "rgba(11,143,156,0.12)",
  },

  radius: 14,
};

export default colors;
