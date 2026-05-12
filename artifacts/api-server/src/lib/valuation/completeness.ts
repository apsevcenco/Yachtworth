// Per-field weights reflecting impact on valuation accuracy.
// Final percent score is normalized to [0,100].
// In specs mode, builder + model are not applicable and excluded from total.
const COMPLETENESS_WEIGHTS: Record<string, number> = {
  type: 15,
  year_built: 15,
  length_meters: 15,
  builder: 10,
  model: 8,
  configuration: 6,
  engine_maker: 4,
  engine_model: 2,
  horse_power: 5,
  engine_config: 2,
  engine_count: 2,
  gross_tonnage: 4,
  hull_material: 3,
  displacement_tonnes: 3,
  beam_meters: 2,
  condition: 5,
  refit_year: 3,
  draft_meters: 1,
  range_nm: 2,
  cabins: 1,
  crew: 1,
};

const CRITICAL = ["type", "year_built", "length_meters", "sale_region"];

export interface CompletenessResult {
  score: number;
  filled: number;
  total: number;
  missing_critical: string[];
}

export function computeCompleteness(
  b: Record<string, unknown>,
  mode: "builder" | "specs",
): CompletenessResult {
  let earned = 0;
  let possible = 0;
  let filled = 0;
  let total = 0;
  const missing: string[] = [];

  for (const [k, w] of Object.entries(COMPLETENESS_WEIGHTS)) {
    if (mode === "specs" && (k === "builder" || k === "model")) continue;
    possible += w;
    total++;
    const v = b[k];
    const isFilled = v !== undefined && v !== null && String(v).trim() !== "";
    if (isFilled) {
      earned += w;
      filled++;
    }
  }

  for (const k of CRITICAL) {
    const v = b[k];
    const isFilled = v !== undefined && v !== null && String(v).trim() !== "";
    if (!isFilled) missing.push(k);
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  return { score, filled, total, missing_critical: missing };
}
