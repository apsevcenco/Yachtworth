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
const acidBlack = "#07000B";
const acidPanel = "#1D002B";
const acidLime = "#C8FF00";
const acidCyan = "#FF38E8";
const acidCoral = "#FF386C";
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
    text: "#FAFFF2",
    tint: acidLime,

    background: acidBlack,
    foreground: "#FAFFF2",

    card: acidPanel,
    cardForeground: "#FAFFF2",

    primary: acidLime,
    primaryForeground: acidBlack,

    secondary: "#2C003F",
    secondaryForeground: "#FAFFF2",

    muted: "#240032",
    mutedForeground: "rgba(250,255,242,0.72)",

    accent: acidCyan,
    accentForeground: acidBlack,

    destructive: acidCoral,
    destructiveForeground: "#FFFFFF",

    border: "rgba(255,56,232,0.42)",
    input: "rgba(255,56,232,0.28)",

    neon: acidLime,
    neonAlt: "#FF8A00",
    hot: acidCoral,
    violet: "#9B5CFF",
    glow: "rgba(200,255,0,0.22)",
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
