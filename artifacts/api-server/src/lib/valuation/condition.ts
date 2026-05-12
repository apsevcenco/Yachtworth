export const CONDITION_MULTIPLIERS: Record<string, number> = {
  New: 1.05,
  Excellent: 1.0,
  Good: 0.93,
  Fair: 0.83,
  "Needs Refit": 0.7,
  Project: 0.5,
};

export function conditionMultiplierFor(
  condition: string | undefined | null,
): number {
  if (!condition) return 1.0;
  return CONDITION_MULTIPLIERS[condition.trim()] ?? 1.0;
}
