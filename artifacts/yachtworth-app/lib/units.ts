export type UnitsSystem = "metric" | "imperial";

export const M_PER_FT = 0.3048;
export const FT_PER_M = 1 / M_PER_FT; // 3.28084
export const T_PER_LT = 1.01605;
export const LT_PER_T = 1 / T_PER_LT; // 0.984207

export const STORAGE_KEY = "yachtworth.units";

function trimZero(n: number, decimals: number): string {
  return n.toFixed(decimals).replace(/\.?0+$/, "");
}

/**
 * Parse a comparable's length string (returned by the AI in metric, e.g. "28.5m"
 * or sometimes "94 ft") and re-format it for the user's preferred unit system.
 */
export function formatComparableLength(
  s: string | null | undefined,
  units: UnitsSystem,
): string {
  if (!s) return "";
  const raw = String(s).trim();
  const num = parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, ""));
  if (!isFinite(num) || num <= 0) return raw;
  const isFeet = /ft|'/i.test(raw);
  const meters = isFeet ? num * M_PER_FT : num;
  if (units === "metric") return `${trimZero(meters, 1)}m`;
  return `${Math.round(meters * FT_PER_M)}ft`;
}
