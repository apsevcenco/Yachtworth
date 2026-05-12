// Per-field weights reflecting impact on valuation accuracy.
// Final percent score is normalized to [0,100].
const COMPLETENESS_WEIGHTS: Record<string, number> = {
  type: 15,
  year_built: 15,
  length_meters: 15,
  shipyard: 10,
  model: 8,
  configuration: 6,
  engines_hp: 5,
  beam_meters: 4,
  hull_material: 3,
  condition: 5,
  notes: 2,
};

const CRITICAL = ["type", "year_built", "length_meters"];

export interface CompletenessResult {
  score: number;
  filled: number;
  total: number;
  missing_critical: string[];
}

export function computeCompleteness(
  b: Record<string, unknown>,
): CompletenessResult {
  let earned = 0;
  let possible = 0;
  let filled = 0;
  let total = 0;
  const missing: string[] = [];

  for (const [k, w] of Object.entries(COMPLETENESS_WEIGHTS)) {
    possible += w;
    total++;
    const v = b[k];
    const isFilled = v !== undefined && v !== null && String(v).trim() !== "";
    if (isFilled) {
      earned += w;
      filled++;
    } else if (CRITICAL.includes(k)) {
      missing.push(k);
    }
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  return { score, filled, total, missing_critical: missing };
}
