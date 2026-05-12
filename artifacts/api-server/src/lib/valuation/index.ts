import type { Logger } from "pino";
import { conditionMultiplierFor } from "./condition";
import { computeCompleteness } from "./completeness";
import {
  aiChat,
  aiResponses,
  cleanReasoning,
  extractJson,
} from "./openai";
import { parsePriceEur, sanityCheckPrice } from "./sanity";

export interface ValuationRequest {
  type: string;
  configuration?: string | null;
  length_meters: number;
  year_built: number;
  condition: string;
  shipyard?: string | null;
  model?: string | null;
  beam_meters?: number | null;
  hull_material?: string | null;
  engines_hp?: number | null;
  notes?: string | null;
}

export interface ComparableItem {
  builder?: string | null;
  model?: string | null;
  year?: number | null;
  length?: string | null;
  condition?: string | null;
  price: string;
  note?: string | null;
}

export interface ValuationResult {
  estimated_price_eur: number;
  distressed_price_eur: number;
  quick_sale_price_eur: number;
  range_low_eur: number;
  range_high_eur: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  comparables: ComparableItem[];
  condition_baseline_eur: number;
  condition_multiplier: number;
  condition_adjustment_pct: number;
  completeness_score: number;
  sanity_adjusted: boolean;
  sanity_band_label: string | null;
  currency: "EUR";
}

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

function specsBlock(b: ValuationRequest): string {
  return [
    `Type: ${TYPE_LABELS[b.type] ?? b.type}`,
    b.configuration && `Configuration: ${b.configuration}`,
    b.shipyard && `Builder: ${b.shipyard}`,
    b.model && `Model: ${b.model}`,
    `Build year: ${b.year_built}`,
    `Condition: ${b.condition}`,
    `Length (LOA): ${b.length_meters} m`,
    b.beam_meters && `Beam: ${b.beam_meters} m`,
    b.hull_material && `Hull material: ${b.hull_material}`,
    b.engines_hp && `Total horsepower: ${b.engines_hp} HP`,
    b.notes && `Owner notes: ${b.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPrompt(b: ValuationRequest, completenessScore: number): string {
  const specs = specsBlock(b);
  const yearMin = b.year_built - 3;
  const yearMax = b.year_built + 3;

  return `You are a professional superyacht market appraiser with access to live yacht listing databases. Find REAL, currently listed or recently sold yachts that closely match the target vessel and use them to determine its fair market value. Use web search iteratively — refine queries as you learn more about this vessel's segment, and verify data on actual listing pages before using it.

TARGET VESSEL SPECIFICATIONS:
${specs}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA COMPLETENESS: ${completenessScore}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Calibrate your confidence honestly:
- < 30% → confidence MUST be "low"
- 30–49% → confidence at most "medium"
- 50–69% → confidence "medium"; "high" only if comparables cluster tightly
- ≥ 70% → "high" acceptable when comparables agree

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEARCH INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Search YachtWorld, Boat Trader, RightBoat, Boat24, Apollo Duck, broker websites (Fraser, Burgess, Camper & Nicholsons, Edmiston, De Valk).
Find 5 comparables matching: same type, year ${yearMin}–${yearMax}, length ±15%${b.shipyard ? `, builder priority: ${b.shipyard}` : ""}.

⚠ CRITICAL — DO NOT FACTOR CONDITION INTO YOUR PRICE:
The "Condition" field is informational only. The downstream system applies a separate, deterministic multiplier off your number. Therefore: PRICE THE TARGET AS IF IT WERE IN "EXCELLENT" CONDITION regardless of what the Condition field says. Do not discount or premium-adjust your number for condition. Do not mention a condition adjustment for the target in your reasoning.

The downstream system applies separate discounts to derive Discreet Sale (≈ −20%) and Quick Sale (≈ −30%) tiers, so your number is just the open-market Excellent-condition headline.

Return ONLY this JSON (no markdown, no text before or after):
{
  "estimated_price": "€ X,XXX,XXX",
  "confidence": "high|medium|low",
  "reasoning": "3–4 sentences citing the comparable listings found and explaining how the target's specs compare to them — but DO NOT mention condition adjustment for the target.",
  "comparables": [
    {
      "builder": "Exact builder",
      "model": "Exact model/series",
      "year": 2018,
      "length": "28.5m",
      "condition": "Good",
      "price": "€ 2,850,000",
      "note": "Specific spec differences vs target"
    }
  ]
}

RULES:
- Comparables array MUST contain EXACTLY 5 entries from real listings
- DO NOT include vessel/owner names, flag, brokerage names
- "builder" must contain ONLY the shipyard name
- DO NOT invent pricing — every price comes from a real listing or confirmed sale`;
}

export async function runValuation(
  b: ValuationRequest,
  log: Logger,
): Promise<ValuationResult> {
  const completeness = computeCompleteness(
    b as unknown as Record<string, unknown>,
  );
  const prompt = buildPrompt(b, completeness.score);

  let result: Record<string, unknown>;
  try {
    const raw = await aiResponses(prompt, "gpt-5-mini", [
      { type: "web_search_preview" },
    ]);
    if (!raw) throw new Error("Empty response");
    result = extractJson(raw);
  } catch (primaryErr) {
    log.warn(
      { err: primaryErr instanceof Error ? primaryErr.message : primaryErr },
      "Responses API failed, falling back to chat completions",
    );
    const fallback = await aiChat([
      {
        role: "system",
        content:
          "You are an expert superyacht market appraiser. Reply ONLY with valid JSON, no markdown.",
      },
      { role: "user", content: prompt },
    ]);
    result = extractJson(fallback);
  }

  const reasoning = cleanReasoning(result.reasoning);
  const rawComparables = Array.isArray(result.comparables)
    ? (result.comparables as Record<string, unknown>[])
    : [];
  const comparables: ComparableItem[] = rawComparables.slice(0, 8).map((c) => ({
    builder: typeof c.builder === "string" ? c.builder : null,
    model: typeof c.model === "string" ? c.model : null,
    year: typeof c.year === "number" ? c.year : null,
    length: typeof c.length === "string" ? c.length : null,
    condition: typeof c.condition === "string" ? c.condition : null,
    price: typeof c.price === "string" ? c.price : "",
    note:
      typeof c.note === "string"
        ? cleanReasoning(c.note)
        : null,
  }));

  // Sanity check + clamp
  let aiPriceEur = parsePriceEur(result.estimated_price);
  let sanityAdjusted = false;
  let sanityBandLabel: string | null = null;
  let confidence: "high" | "medium" | "low" =
    (result.confidence as "high" | "medium" | "low" | undefined) ?? "low";
  if (!["high", "medium", "low"].includes(confidence)) confidence = "low";

  if (aiPriceEur) {
    const check = sanityCheckPrice(
      aiPriceEur,
      b.length_meters,
      b.type,
      b.configuration ?? null,
    );
    if (!check.ok) {
      sanityAdjusted = true;
      sanityBandLabel = check.rangeKey;
      aiPriceEur = check.clampedEur;
      confidence = "low";
    }
  } else {
    // AI returned unparseable price — fall back to mid-band heuristic
    const check = sanityCheckPrice(
      b.length_meters * 30000, // arbitrary trigger
      b.length_meters,
      b.type,
      b.configuration ?? null,
    );
    aiPriceEur = ((check.range[0] + check.range[1]) / 2) * b.length_meters;
    sanityAdjusted = true;
    sanityBandLabel = check.rangeKey;
    confidence = "low";
  }

  // Confidence floor based on completeness
  const rank = { low: 0, medium: 1, high: 2 } as const;
  const cap = (max: "low" | "medium" | "high") => {
    if (rank[confidence] > rank[max]) confidence = max;
  };
  if (completeness.score < 30) cap("low");
  else if (completeness.score < 50) cap("medium");
  else if (completeness.score < 70) cap("medium");

  // Condition multiplier (deterministic, server-authoritative)
  const conditionMultiplier = conditionMultiplierFor(b.condition);
  const conditionAdjustmentPct = Math.round((conditionMultiplier - 1) * 100);
  const baselineEur = Math.round(aiPriceEur);
  const adjustedEur = aiPriceEur * conditionMultiplier;

  return {
    estimated_price_eur: Math.round(adjustedEur),
    distressed_price_eur: Math.round(adjustedEur * 0.8),
    quick_sale_price_eur: Math.round(adjustedEur * 0.7),
    range_low_eur: Math.round(adjustedEur * 0.9),
    range_high_eur: Math.round(adjustedEur * 1.1),
    confidence,
    reasoning,
    comparables,
    condition_baseline_eur: baselineEur,
    condition_multiplier: conditionMultiplier,
    condition_adjustment_pct: conditionAdjustmentPct,
    completeness_score: completeness.score,
    sanity_adjusted: sanityAdjusted,
    sanity_band_label: sanityBandLabel,
    currency: "EUR",
  };
}
