import { Router } from "express";
import pg from "pg";
import { strictLimiter } from "../middlewares/rateLimit";
import { EstimateMarketPriceBody, ValuationBody } from "@workspace/api-zod";
import { validateBody } from "../middlewares/validate";

// ============================================================================
// DB pool + valuation_requests table (fire-and-forget logging for ML dataset)
// ============================================================================
let pool: pg.Pool | null = null;
function db(): pg.Pool {
  if (!pool) {
    const dbUrl = process.env["DATABASE_URL"];
    if (!dbUrl) throw new Error("DATABASE_URL not set");
    pool = new pg.Pool({ connectionString: dbUrl, max: 5 });
    runValuationMigration().catch((e) =>
      console.error("[valuation] Migration error:", e),
    );
  }
  return pool;
}

let valuationMigrationDone = false;
let valuationMigrationPromise: Promise<void> | null = null;
async function runValuationMigration(): Promise<void> {
  if (valuationMigrationDone) return;
  if (valuationMigrationPromise) return valuationMigrationPromise;
  valuationMigrationPromise = (async () => {
    const client = await db().connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS valuation_requests (
          id bigserial PRIMARY KEY,
          input jsonb NOT NULL,
          output jsonb NOT NULL,
          ip text,
          confidence text,
          estimated_price_eur numeric,
          sanity_adjusted boolean DEFAULT false,
          completeness_score int,
          created_at timestamptz DEFAULT now()
        );
        ALTER TABLE valuation_requests
          ADD COLUMN IF NOT EXISTS completeness_score int;
      `);
      valuationMigrationDone = true;
      console.log("[valuation] Migration complete");
    } catch (e: any) {
      if (e?.code === "23505" || e?.code === "42P07") {
        valuationMigrationDone = true;
        console.log("[valuation] Migration complete (table already existed)");
      } else {
        throw e;
      }
    } finally {
      client.release();
    }
  })().catch((e) => {
    valuationMigrationPromise = null;
    throw e;
  });
  return valuationMigrationPromise;
}

// ============================================================================
// Price parsing & sanity check
// Reasonable EUR-per-meter ranges for SOLD yachts by type, used to detect
// AI hallucinations. Outside this range -> clamp to boundary, lower confidence.
// ============================================================================
// Sanity ranges keyed by `${class} / ${configuration}` (lowercased). Lookup
// also falls back to class-only and to legacy single-word keys so old data
// (yacht_listings rows / valuation_requests entries created before the
// taxonomy cleanup) keep producing reasonable bounds.
const PRICE_PER_METER_EUR: Record<string, [number, number]> = {
  // Motor Yacht configurations
  "motor yacht / flybridge":               [12000, 80000],
  "motor yacht / open / express":          [10000, 70000],
  "motor yacht / hard top":                [11000, 75000],
  "motor yacht / coupé":                   [12000, 90000],
  "motor yacht / sport yacht":             [15000, 120000],
  "motor yacht / sport bridge":            [14000, 100000],
  "motor yacht / pilothouse":              [9000, 60000],
  "motor yacht / sedan":                   [8000, 55000],
  "motor yacht / convertible (sportfish)": [10000, 90000],
  "motor yacht / trawler":                 [6000, 40000],
  "motor yacht / long range / explorer":   [25000, 400000],
  "motor yacht / motor gulet":             [4000, 30000],
  "motor yacht / classic motor":           [5000, 100000],

  // Sailing Yacht configurations
  "sailing yacht / sloop":                 [6000, 60000],
  "sailing yacht / ketch":                 [5000, 70000],
  "sailing yacht / cutter":                [6000, 50000],
  "sailing yacht / schooner":              [5000, 80000],
  "sailing yacht / yawl":                  [5000, 60000],
  "sailing yacht / cruiser-racer":         [8000, 100000],
  "sailing yacht / performance cruiser":   [10000, 120000],
  "sailing yacht / bluewater cruiser":     [8000, 90000],
  "sailing yacht / classic sailing":       [4000, 100000],
  "sailing yacht / sailing gulet":         [4000, 25000],

  // Catamaran configurations
  "catamaran / sail catamaran (cruising)":    [10000, 80000],
  "catamaran / sail catamaran (performance)": [12000, 120000],
  "catamaran / power catamaran":              [15000, 180000],
  "catamaran / charter catamaran":            [8000, 60000],

  // Superyacht configurations (24m+)
  "superyacht / tri-deck motor":              [60000, 500000],
  "superyacht / quad-deck motor":             [80000, 800000],
  "superyacht / explorer / expedition":       [80000, 800000],
  "superyacht / sport superyacht":            [70000, 600000],
  "superyacht / classic motor superyacht":    [40000, 400000],
  "superyacht / sailing superyacht":          [50000, 500000],

  // Class-only fallbacks (used when configuration is missing)
  "motor yacht":   [8000, 250000],
  "sailing yacht": [5000, 120000],
  "catamaran":     [8000, 180000],
  "superyacht":    [40000, 800000],

  // Legacy single-word fallbacks (pre-taxonomy data)
  "explorer yacht": [25000, 400000],
  "sport cruiser":  [10000, 90000],
  "trawler":        [6000, 40000],
  "classic yacht":  [4000, 100000],
  "gulet":          [4000, 30000],
  "flybridge":      [12000, 80000],
};
const DEFAULT_PRICE_PER_METER: [number, number] = [4000, 300000];

// Premium-segment overrides: when a yacht reaches a certain length, the
// per-meter economics change dramatically (build quality, equipment level,
// brand premium). The default table above is calibrated for the volume market
// (12-18m), and clips legitimate premium prices in larger boats. These
// overrides apply when length >= minLength and replace the base range.
const PREMIUM_PRICE_PER_METER_EUR: Record<
  string,
  { minLength: number; range: [number, number] }
> = {
  "motor yacht / flybridge":                  { minLength: 20, range: [60000, 250000] },
  "motor yacht / open / express":             { minLength: 20, range: [55000, 220000] },
  "motor yacht / hard top":                   { minLength: 20, range: [60000, 230000] },
  "motor yacht / coupé":                      { minLength: 20, range: [70000, 250000] },
  "motor yacht / sport yacht":                { minLength: 20, range: [70000, 280000] },
  "motor yacht / sport bridge":               { minLength: 20, range: [70000, 250000] },
  "motor yacht / convertible (sportfish)":    { minLength: 20, range: [60000, 250000] },
  "motor yacht / pilothouse":                 { minLength: 20, range: [50000, 200000] },
  "motor yacht / sedan":                      { minLength: 20, range: [45000, 180000] },
  "sailing yacht / performance cruiser":      { minLength: 20, range: [50000, 250000] },
  "sailing yacht / bluewater cruiser":        { minLength: 20, range: [40000, 200000] },
  "catamaran / power catamaran":              { minLength: 18, range: [60000, 280000] },
  "catamaran / sail catamaran (performance)": { minLength: 18, range: [50000, 220000] },
  "catamaran / sail catamaran (cruising)":    { minLength: 18, range: [40000, 180000] },
};

function parsePriceEur(s: unknown): number | null {
  if (typeof s !== "string") return null;
  let v = s.replace(/[^\d.,]/g, "");
  if (!v) return null;
  if (v.includes(".") && v.includes(",")) {
    if (v.lastIndexOf(",") > v.lastIndexOf(".")) {
      v = v.replace(/\./g, "").replace(",", ".");
    } else {
      v = v.replace(/,/g, "");
    }
  } else if (v.includes(",")) {
    const parts = v.split(",");
    if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
      v = v.replace(/,/g, "");
    } else {
      v = v.replace(",", ".");
    }
  } else if (v.includes(".")) {
    const parts = v.split(".");
    if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
      v = v.replace(/\./g, "");
    }
  }
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : null;
}

function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US");
}

interface SanityCheckResult {
  ok: boolean;
  clampedEur: number;
  range: [number, number];
  rangeKey: string;
  isPremiumBand: boolean;
  perMeter: number;
}

function sanityCheckPrice(
  priceEur: number,
  lengthMeters: number,
  type: string,
  configuration?: string,
): SanityCheckResult {
  const t = String(type || "").toLowerCase().trim();
  const c = String(configuration || "").toLowerCase().trim();
  const fullKey = c ? `${t} / ${c}` : t;
  // Premium override applies when boat is large enough — large flybridges,
  // sport yachts etc. follow different per-meter economics than 12-18m volume
  // boats. Try premium first, then base table (specific → class → legacy →
  // default), so old data (e.g. "Trawler" as top-level type) still works.
  const premium = PREMIUM_PRICE_PER_METER_EUR[fullKey];
  let range: [number, number];
  let rangeKey: string;
  let isPremiumBand = false;
  if (premium && lengthMeters >= premium.minLength) {
    range = premium.range;
    rangeKey = `${fullKey} (≥${premium.minLength}m premium)`;
    isPremiumBand = true;
  } else if (c && PRICE_PER_METER_EUR[fullKey]) {
    range = PRICE_PER_METER_EUR[fullKey];
    rangeKey = fullKey;
  } else if (PRICE_PER_METER_EUR[t]) {
    range = PRICE_PER_METER_EUR[t];
    rangeKey = t;
  } else {
    range = DEFAULT_PRICE_PER_METER;
    rangeKey = "default";
  }
  const perMeter = priceEur / lengthMeters;
  if (perMeter < range[0]) {
    return { ok: false, clampedEur: range[0] * lengthMeters, range, rangeKey, isPremiumBand, perMeter };
  }
  if (perMeter > range[1]) {
    return { ok: false, clampedEur: range[1] * lengthMeters, range, rangeKey, isPremiumBand, perMeter };
  }
  return { ok: true, clampedEur: priceEur, range, rangeKey, isPremiumBand, perMeter };
}

const router = Router();

const OPENAI_BASE_URL = "https://api.openai.com/v1";

function getApiKey(): string {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

async function aiChat(
  messages: { role: string; content: string }[],
  model = "gpt-5-mini"
): Promise<string> {
  const apiKey = getApiKey();
  const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OpenAI chat ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function aiResponses(
  input: string,
  model = "gpt-5-mini",
  tools?: any[]
): Promise<string> {
  const apiKey = getApiKey();
  const body: Record<string, any> = { model, input };
  if (tools) body.tools = tools;
  const resp = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OpenAI responses ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    output_text?: string;
    output?: any[];
  };
  if (data.output_text) return data.output_text;
  const msg = data.output?.find((o: any) => o.type === "message");
  const txt = msg?.content?.find((c: any) => c.type === "output_text")?.text;
  return txt || "";
}

function extractJson(raw: string): any {
  const cleaned = raw
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in AI response");
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }
  throw new Error("Unbalanced JSON in AI response");
}

function cleanReasoning(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\(\[([^\]]+)\]\([^)]+\)\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

// ─── Condition taxonomy ──────────────────────────────────────────────────
// Server-authoritative multiplier applied AFTER the AI returns its
// Excellent-baseline price. Single source of truth — the AI is explicitly
// told NOT to factor condition into its number, so the multiplier here is
// the ONLY place condition affects the final price (no double-counting).
//
// Bands sit in the middle of consensus broker/surveyor practice (HMY,
// BoatUS valuation guide, IYBA appraisers). To change a band, edit only
// this table — no other code or prompt copy needs to move.
const CONDITION_MULTIPLIERS: Record<string, number> = {
  "New": 1.05,
  "Excellent": 1.00,
  "Good": 0.93,
  "Fair": 0.83,
  "Needs Refit": 0.70,
  "Project": 0.50,
};
function conditionMultiplierFor(condition: string | undefined | null): number {
  if (!condition) return 1.00;
  return CONDITION_MULTIPLIERS[condition.trim()] ?? 1.00;
}

// ─── Region taxonomy ──────────────────────────────────────────────────────
// Human-readable labels + the explicit list of countries / brokerage hubs
// the AI is allowed to use as comparable sources for each region. Keep this
// in sync with SALE_REGIONS in artifacts/pdye/src/pages/Valuation.tsx.
const REGION_LABELS: Record<string, string> = {
  mediterranean: "Mediterranean (FR, IT, ES, MC, GR, HR, TR, MT)",
  northern_europe: "Northern Europe incl. UK (UK, NL, DE, DK, NO, SE, FI, BE)",
  north_america_caribbean: "North America & Caribbean (US, CA, BS, KY, BVI, USVI, ATG)",
  asia_pacific_me: "Asia-Pacific & Middle East (AE, SG, HK, TH, AU, NZ, JP, CN)",
  global: "Global (no regional restriction)",
};
const REGION_GUIDANCE: Record<string, string> = {
  mediterranean:
    "Restrict comparables to vessels currently asking, listed in, or recently sold inside the Mediterranean basin (France incl. French Riviera, Italy, Spain incl. Balearics, Monaco, Greece, Croatia, Turkey, Malta). Mediterranean asking prices typically run 5–15% above US asking prices for equivalent tonnage; do NOT cross-substitute US-located listings into a Mediterranean valuation.",
  northern_europe:
    "Restrict comparables to vessels asking, listed, or recently sold in Northern Europe (UK, Netherlands, Germany, Denmark, Norway, Sweden, Finland, Belgium). UK & NL brokerages (Sunseeker, Princess, Burgess, Edmiston UK, De Valk) are the primary reference. Do NOT substitute Mediterranean or US listings into the cohort.",
  north_america_caribbean:
    "Restrict comparables to vessels asking, listed, or recently sold in the United States, Canada, or the Caribbean (Bahamas, Cayman, BVI, USVI, Antigua, St Maarten). USD-denominated listings are expected — convert to EUR at the current spot rate. Do NOT cross-substitute Mediterranean or Northern European listings; US asking prices are typically 5–15% lower than Med asking for equivalent tonnage.",
  asia_pacific_me:
    "Restrict comparables to vessels asking, listed, or recently sold in the UAE (Dubai, Abu Dhabi), Saudi, Qatar, Singapore, Hong Kong, Thailand (Phuket), Australia, New Zealand, Japan, or China. This region trades thinner volumes — if you cannot find 5 region-matched comparables after 2 search refinements, you may include up to 2 Mediterranean comparables AND mark confidence as 'low'.",
  global:
    "No regional restriction — accept comparables from any major brokerage market (Med, Northern Europe, US/Caribbean, APAC/ME). Note in the reasoning which markets your comparables came from.",
};

function briefYacht(y: Record<string, unknown>): string {
  return [
    y.name,
    y.type,
    y.builder,
    y.year,
    y.refit ? `refit:${y.refit}` : null,
    y.length,
    y.beam,
    y.draft,
    y.hull_material,
    y.engines,
    y.horse_power,
    y.max_speed,
    y.range,
    y.cabins ? `${y.cabins}cab` : null,
    y.crew ? `${y.crew}crew` : null,
    y.condition,
    y.location,
    y.flag,
    y.price ? `asking:${y.price}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

router.post("/estimate-market-price", validateBody(EstimateMarketPriceBody), async (req, res) => {
  try {
    const yacht = req.body as Record<string, unknown>;

    const targetDesc = briefYacht(yacht);

    const searchPrompt = `You are a superyacht market appraiser. Search the web for current asking prices of similar yachts on YachtWorld, RightBoat, Boat24, Fraser Yachts, Burgess Yachts, and similar platforms. Refine your searches as you learn more about this vessel's segment.

YACHT TO APPRAISE:
${targetDesc}

After searching, estimate the fair market value in EUR. Return ONLY this exact JSON (no markdown):
{"market_price":"€ X,XXX,XXX","confidence":"high|medium|low","reasoning":"2 sentences citing actual comparable listings found online.","sources":"list the yacht sales sites you found data on"}`;

    let result: {
      market_price: string;
      confidence: string;
      reasoning: string;
      sources?: string;
    };

    try {
      const rawText = await aiResponses(searchPrompt, "gpt-5-mini", [
        { type: "web_search_preview" },
      ]);
      if (!rawText) throw new Error("Empty response");
      result = extractJson(rawText);
    } catch (responsesErr) {
      console.warn(
        "Responses API failed, using chat completions:",
        responsesErr instanceof Error ? responsesErr.message : responsesErr
      );
      const raw = await aiChat([
        {
          role: "system",
          content:
            "You are an expert superyacht appraiser with deep knowledge of the global yacht market. Reply ONLY with valid JSON.",
        },
        {
          role: "user",
          content: `Estimate the fair market value in EUR for this yacht:\n${targetDesc}\n\nReturn ONLY: {"market_price":"€ X,XXX,XXX","confidence":"high|medium|low","reasoning":"2 sentences based on market knowledge.","sources":"YachtWorld, RightBoat, Fraser Yachts (market knowledge)"}`,
        },
      ]);
      if (!raw) throw new Error("AI returned empty response");
      result = extractJson(raw);
    }

    res.json({
      market_price: result.market_price,
      confidence: result.confidence,
      reasoning: cleanReasoning(result.reasoning),
      sources: result.sources || "",
    });
  } catch (err: unknown) {
    console.error("Estimate error:", err);
    const msg = err instanceof Error ? err.message : "Estimation failed";
    res.status(500).json({ error: msg });
  }
});

// Public free valuation tool — advertised on the home page as
// "No registration required". Rate-limited (strictLimiter) to deter
// abuse, but intentionally NOT gated behind requireUser.
// Lazy import to avoid circular init order: yachtListings.ts also opens its
// own pg pool but `findComparables` is safe to call at any time.
import { findComparables, type Comparable } from "./yachtListings";

// ============================================================================
// Completeness scoring
// Each spec field carries a weight reflecting its impact on valuation accuracy.
// The final percent score is normalized to [0,100] via earned/possible, so the
// raw sum of weights does not have to land on a round number — the math works
// regardless. (Current sums: ~102 in builder mode, ~92 in specs mode.)
// IMPORTANT: keep this map in sync with the duplicated weights in the frontend
// `Valuation.tsx` (look for COMPLETENESS_WEIGHTS).
// ============================================================================
const COMPLETENESS_WEIGHTS: Record<string, number> = {
  // Critical (45)
  type: 15,
  year: 15,
  length: 15,
  // Identity / brand (24)
  builder: 10,         // only counted in builder mode
  model: 8,            // only counted in builder mode (no builder ⇒ no model)
  configuration: 6,    // always counted (Flybridge / Open / Sloop / etc.)
  // Engines (15)
  engine_maker: 4,
  engine_model: 2,
  horse_power: 5,
  engines: 2,
  engine_count: 2,
  // Hull / mass (12)
  gross_tonnage: 4,
  hull_material: 3,
  displacement: 3,
  beam: 2,
  // Condition / refit (8)
  condition: 5,
  refit: 3,
  // Performance / capacity (10)
  draft: 1,
  fuel_type: 1,
  fuel_capacity: 2,
  max_speed: 2,
  cruise_speed: 1,
  range: 2,
  cabins: 1,
  // Misc (negligible weight, total ≤ 0)
  hull_type: 1,
  heads: 0,
  berths: 0,
  crew: 1,
  water_capacity: 0,
};

type CompletenessResult = {
  score: number;          // 0–100
  filled: number;         // count of filled fields
  total: number;          // count of weighted fields
  missing_critical: string[];
};

function computeCompleteness(
  b: Record<string, unknown>,
  mode: string
): CompletenessResult {
  let earned = 0;
  let possible = 0;
  let filled = 0;
  let total = 0;
  const missing: string[] = [];
  const CRITICAL = ["type", "year", "length"];
  for (const [k, w] of Object.entries(COMPLETENESS_WEIGHTS)) {
    if ((k === "builder" || k === "model") && mode !== "builder") continue;
    possible += w;
    total++;
    const v = b[k];
    const isFilled =
      v !== undefined &&
      v !== null &&
      String(v).trim() !== "";
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

function formatComparablesBlock(matches: Comparable[]): string {
  if (matches.length === 0) return "";
  const rows = matches.map((m, i) => {
    const parts: string[] = [];
    if (m.builder) parts.push(m.builder);
    if (m.model) parts.push(m.model);
    if (m.year) parts.push(`${m.year}`);
    if (m.length_m) parts.push(`${m.length_m}m`);
    const head = parts.join(" ") || `Listing #${i + 1}`;
    const price = m.price_eur
      ? `€${Math.round(m.price_eur).toLocaleString("en-US")}`
      : "n/a";
    const status = m.is_sold ? "SOLD" : "asking";
    const region = m.region ? `, ${m.region}` : "";
    return `  ${i + 1}. ${head} — ${price} (${status}${region})`;
  });
  return rows.join("\n");
}

router.post("/valuation", strictLimiter, validateBody(ValuationBody), async (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { mode, units } = b;
    const modeStr = String(mode || "specs");
    const completeness = computeCompleteness(b, modeStr);

    const unitNote =
      units === "imperial" ? " (imperial units)" : " (metric units)";

    const specs = [
      b.type && `Type: ${b.type}`,
      b.configuration && `Configuration / style: ${b.configuration}`,
      mode === "builder" && b.builder ? `Builder: ${b.builder}` : null,
      mode === "builder" && b.model ? `Model: ${b.model}` : null,
      b.year && `Build year: ${b.year}`,
      b.refit && `Refit year: ${b.refit}`,
      b.condition && `Condition: ${b.condition}`,
      b.length && `Length (LOA): ${b.length}${unitNote}`,
      b.beam && `Beam: ${b.beam}${unitNote}`,
      b.draft && `Draft: ${b.draft}${unitNote}`,
      b.displacement &&
        `Displacement: ${b.displacement}${units === "imperial" ? " LT" : " tonnes"}`,
      b.gross_tonnage && `Gross tonnage: ${b.gross_tonnage} GT`,
      b.hull_material && `Hull material: ${b.hull_material}`,
      b.hull_type && `Hull type: ${b.hull_type}`,
      b.engines && `Engine configuration: ${b.engines}`,
      b.engine_count && `Number of engines: ${b.engine_count}`,
      b.engine_maker && `Engine manufacturer: ${b.engine_maker}`,
      b.engine_model && `Engine model/series: ${b.engine_model}`,
      b.horse_power && `Total horsepower: ${b.horse_power} HP`,
      b.fuel_type && `Fuel type: ${b.fuel_type}`,
      b.fuel_capacity &&
        `Fuel capacity: ${b.fuel_capacity}${units === "imperial" ? " gal" : " L"}`,
      b.water_capacity &&
        `Water capacity: ${b.water_capacity}${units === "imperial" ? " gal" : " L"}`,
      b.max_speed && `Max speed: ${b.max_speed} kts`,
      b.cruise_speed && `Cruise speed: ${b.cruise_speed} kts`,
      b.range && `Range: ${b.range} nm`,
      b.cabins && `Guest cabins: ${b.cabins}`,
      b.heads && `Heads (WC): ${b.heads}`,
      b.berths && `Total berths: ${b.berths}`,
      b.crew && `Crew capacity: ${b.crew}`,
      b.sale_region && `Intended sale region: ${REGION_LABELS[String(b.sale_region)] || b.sale_region}`,
      b.vat_status &&
        `VAT / Tax status: ${b.vat_status === "paid" ? "VAT PAID (EU free circulation)" : "VAT NOT PAID (offshore / not in EU free circulation)"}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!specs) {
      res.status(400).json({ error: "At least some specifications required" });
      return;
    }

    const yearNum = parseInt(String(b.year || "0"));
    const yearMin = yearNum > 0 ? yearNum - 3 : null;
    const yearMax = yearNum > 0 ? yearNum + 3 : null;
    const yearRange =
      yearMin && yearMax ? `${yearMin}–${yearMax}` : "similar year";

    const modeNote =
      mode === "builder"
        ? "Factor in this builder's specific brand premium and reputation in the current market."
        : "Assess purely on technical specifications — do not infer or assume any brand.";

    // ─── Region & VAT cohort blocks ────────────────────────────────────────
    // Both are passed to BOTH the main and fallback prompts so the AI is
    // forced to filter its comparable cohort before averaging. We do NOT
    // apply a percentage haircut after the fact — cohort filtering is the
    // ONLY mechanism (a 5m sailboat that's "VAT-paid" is in a structurally
    // different market from a 5m sailboat that isn't).
    const regionKey = typeof b.sale_region === "string" ? b.sale_region : "";
    const vatKey = typeof b.vat_status === "string" ? b.vat_status : "";

    const regionBlock = regionKey
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGIONAL COHORT FILTER — ${(REGION_LABELS[regionKey] || regionKey).toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user is valuing this vessel for sale in: ${REGION_LABELS[regionKey] || regionKey}.

${REGION_GUIDANCE[regionKey] || ""}

This is NOT advisory — it is a HARD FILTER on which listings you may use as comparables. A vessel located in Florida is NOT a comparable for a Mediterranean valuation, even if its specs match perfectly. Search with region-specific queries (e.g. "[builder] [model] for sale Monaco|France|Italy|Spain" for Mediterranean; "[builder] [model] for sale Florida|California|Newport" for North America). In your reasoning, explicitly state the regional market your final price reflects (e.g. "Based on 5 Mediterranean asking prices…").`
      : "";

    const vatBlock = vatKey
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VAT / TAX STATUS COHORT FILTER — ${vatKey === "paid" ? "VAT PAID (EU FREE CIRCULATION)" : "VAT NOT PAID (OFFSHORE / NOT IN EU FREE CIRCULATION)"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The target vessel is ${vatKey === "paid" ? "VAT PAID — i.e. it has cleared EU import VAT and trades in free circulation inside the EU customs union" : "NOT VAT PAID — i.e. it is offshore-flagged or otherwise not in EU free circulation, so an EU buyer would owe import VAT (typically ~17–22% depending on jurisdiction) on top of the asking price"}.

These are STRUCTURALLY DIFFERENT markets — not a percentage discount. Match comparables to the target's VAT status:
- Listings on EU brokerages (yachtworld.it, yachtall.com, de Valk NL, Berthon UK, Camper & Nicholsons EU) almost always state "VAT paid" or "VAT not paid" in the spec sheet — read it.
- Common indicators of VAT NOT PAID: vessel currently in non-EU waters (Caribbean, US, Turkey non-EU territory, UAE, Singapore), flagged Cayman / Marshall Islands / BVI / Jersey / Isle of Man with no "EU VAT paid" line.
- Common indicators of VAT PAID: vessel currently in EU waters with EU flag (FR, IT, ES, NL, DE, MT) AND listing explicitly states "VAT paid" or "EU VAT paid".

When selecting comparables, ${vatKey === "paid" ? "USE ONLY listings explicitly tagged 'VAT paid' / 'EU VAT paid'. Listings with no VAT info or tagged 'VAT not paid' must NOT be used as comparables — their asking prices reflect a structurally different market and would distort the estimate." : "USE ONLY listings explicitly tagged 'VAT not paid' / 'offshore' / 'ex-VAT'. Listings tagged 'VAT paid' must NOT be used — their asking prices already include the ~20% VAT and would inflate your estimate."}

This is a HARD COHORT FILTER, not a percentage adjustment. Do NOT take an opposite-VAT-status listing and "adjust it" by ±VAT — those are different markets with different liquidity, different buyer pools, and different ask-to-sale spreads.

If after 2 search refinements you cannot find at least 4 same-VAT-status comparables, you must:
  1. Set overall confidence to "low",
  2. State explicitly in the "reasoning" field that the cohort was thin (e.g. "Only 3 ${vatKey === "paid" ? "VAT-paid" : "VAT-not-paid"} comparables found in the target region"), and
  3. Use whatever same-VAT-status comparables you did find — do NOT pad the cohort with opposite-VAT-status listings.

Mention the VAT status of your cohort explicitly in the "reasoning" field (e.g. "${vatKey === "paid" ? "All comparables are VAT-paid EU listings" : "All comparables are offshore / non-VAT-paid listings"}").`
      : "";

    // ---- Internal comparables DB lookup -----------------------------------
    // If we have ≥3 matches in our own listings DB, inject them as the
    // PRIMARY reference data for the AI. This is more reliable than web
    // search and grounds the valuation in real broker/sale data we control.
    let dbMatches: Comparable[] = [];
    let dbBlock = "";
    try {
      const lenM = parseFloat(String(b.length || "0"));
      // Convert ft -> m if user submitted imperial
      const lenMeters = units === "imperial" ? lenM * 0.3048 : lenM;
      if (b.type && lenMeters > 0) {
        const beamRaw = parseFloat(String(b.beam || "0"));
        const beamM = units === "imperial" ? beamRaw * 0.3048 : beamRaw;
        dbMatches = await findComparables(
          String(b.type),
          yearNum,
          lenMeters,
          10,
          {
            builder: typeof b.builder === "string" ? b.builder : null,
            model: typeof b.model === "string" ? b.model : null,
            configuration: typeof b.configuration === "string" ? b.configuration : null,
            engine_maker: typeof b.engine_maker === "string" ? b.engine_maker : null,
            hull_material: typeof b.hull_material === "string" ? b.hull_material : null,
            gross_tonnage: parseInt(String(b.gross_tonnage || "0")) || null,
            horse_power: parseInt(String(b.horse_power || "0")) || null,
            beam_m: beamM > 0 ? beamM : null,
            refit: parseInt(String(b.refit || "0")) || null,
          }
        );
      }
    } catch (e) {
      console.warn("[valuation] comparables lookup failed:", e instanceof Error ? e.message : e);
    }
    // ---- Data completeness instruction ------------------------------------
    // Tells AI exactly how complete the user's input is, so it calibrates
    // confidence and reasoning honestly.
    const completenessBlock = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA COMPLETENESS: ${completeness.score}% (${completeness.filled}/${completeness.total} fields)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user filled ${completeness.filled} of ${completeness.total} possible specification fields (${completeness.score}% completeness).
Use this to calibrate your confidence honestly:
- < 30% → confidence MUST be "low" and reasoning MUST acknowledge the data is too thin for a precise estimate
- 30–49% → confidence at most "medium"; reasoning should mention which specs are missing
- 50–69% → confidence "medium"; "high" is acceptable only if comparable listings cluster tightly
- ≥ 70% → "high" is acceptable when comparables agree
ALWAYS mention completeness explicitly in your reasoning, e.g. "Based on ${completeness.score}% data completeness…".`;

    if (dbMatches.length >= 3) {
      dbBlock = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIMARY REFERENCE DATA — INTERNAL LISTINGS DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following ${dbMatches.length} comparable yachts come from our own verified internal database (real broker listings and confirmed sales). USE THESE AS THE AUTHORITATIVE BASIS for your valuation. They override any conflicting web-search results.

${formatComparablesBlock(dbMatches)}

You may still cross-reference with web search to refine, but the price you produce MUST be consistent with this internal sample. If the spread inside this sample is narrow, set confidence to "high".`;
    }

    const prompt = `You are a professional superyacht market appraiser with access to live yacht listing databases. Your task is to find REAL, CURRENTLY LISTED OR RECENTLY SOLD yachts that closely match the target vessel, and use them to determine its fair market value. Use web search iteratively — refine your queries as you learn more about this vessel's segment, and verify data on actual listing pages before using it.

TARGET VESSEL SPECIFICATIONS:
${specs}
${completenessBlock}${regionBlock}${vatBlock}${dbBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — SEARCH INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Perform multiple targeted web searches on the following platforms. Search each one:
- YachtWorld (yachtworld.com)
- Boat Trader / boats.com
- RightBoat (rightboat.com)
- Boat24 (boat24.com)
- YachtBroker (yachtbroker.com)
- Apollo Duck (apolloduck.com)
- YachtCharterFleet / YachtSales

Use search queries like:
- "[builder] [model] for sale [year]" — this is the STRONGEST query when both are known
- "[builder] [model] [configuration] for sale" (e.g. "Sunseeker Manhattan flybridge for sale")
- "[type] [configuration] for sale [year range] [length]" (e.g. "motor yacht flybridge 22m 2018")
- "[length]m [type] [year] for sale EUR"
- "[engine maker] [engine model] yacht for sale"

CRITICAL: when builder + model are provided, those define the vessel uniquely. A "Sunseeker Predator 60" and a "Sunseeker Manhattan 60" are different products with different prices (Sport vs Flybridge). Configuration / style (Flybridge / Open / Coupé / Sloop / etc.) is similarly price-defining — never substitute one configuration for another in your comparables.

If your initial searches don't return strong matches, refine your queries (try different builders in the same tier, adjust length range, switch language, search broker websites directly).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — STRICT MATCHING CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Only include a vessel as a comparable if it meets ALL of these criteria:
✓ Same vessel type (or closely related category)
✓ Build year within ${yearRange} (±3 years maximum)
✓ Length within ±15% of the target vessel's length
✓ Similar engine configuration, power range, or fuel type (if specified)
✓ Similar accommodation layout (cabins ±1–2) — if specified
✓ Price is confirmed: listed asking price OR confirmed recent sale price
✗ DO NOT include vessels that don't match on year AND length simultaneously
✗ DO NOT fabricate or estimate vessel data — only use what you actually found on the listing page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — VISIT LISTING PAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For each candidate you find in search results, visit the actual listing page to verify:
- Exact year, length, engine specs and condition
- Confirmed asking price (or sold price)
- Any recent refit or known issues that affect value

If a listing page's specs don't match the target criteria strictly, discard it and search for another.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — VALUATION & OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${modeNote}

Based on the 5 verified comparable listings, determine the fair market value of the target vessel.

⚠ CRITICAL — OPEN MARKET LISTING EQUIVALENT:
Your "estimated_price" represents the OPEN-MARKET LISTING EQUIVALENT — i.e. the price this vessel would be listed at on YachtWorld / RightBoat / TheYachtMarket today, alongside the comparables you found. This is the ASKING-price equivalent, NOT the discounted sold price. Do NOT subtract a generic asking→sold haircut. Compute it as a weighted average of the comparable asking prices, biased toward the closest matches (same builder/model = highest weight, then same year, then same length/engine layout). Adjust up or down for the target vessel's specific spec advantages or disadvantages vs the cohort (newer/older, more/fewer engines, refit history, hull material, etc.).

⚠ CRITICAL — DO NOT FACTOR CONDITION INTO YOUR PRICE:
The "Condition" field (New / Excellent / Good / Fair / Needs Refit / Project) in the target specs is informational ONLY. The downstream system applies a separate, deterministic multiplier off your number to handle condition. Therefore: PRICE THE TARGET AS IF IT WERE IN "EXCELLENT" CONDITION regardless of what the Condition field says. Do not discount or premium-adjust your number for condition. Do not mention a condition adjustment in your "reasoning" — it will be added by the system. (You may still mention condition of the comparables, e.g. "comp #2 was a Fair-condition listing at €X, so I weighted it lower" — that is comp normalisation, not target adjustment.)

The downstream system applies separate, well-documented discounts off this number to derive Discreet Sale (≈ −20%) and Quick Sale (≈ −30%) tiers, so your job is just the open-market Excellent-condition headline.

The price must reflect actual market evidence — not a theoretical estimate.

Return ONLY this JSON (absolutely no markdown, no text before or after):
{
  "estimated_price": "€ X,XXX,XXX",
  "confidence": "high|medium|low",
  "reasoning": "3–4 sentences: cite the comparable listings found, explain how the target vessel's specs compare to them (newer/older, more/fewer engines, refit history, hull material etc.) — but DO NOT mention condition adjustment for the target (system handles that) — and justify the final Excellent-baseline price.",
  "comparables": [
    {
      "builder": "Exact builder name from listing",
      "model": "Exact model/series from listing",
      "year": 2018,
      "length": "28.5m",
      "condition": "Good",
      "price": "€ 2,850,000",
      "note": "Specific spec differences vs target vessel — e.g. twin MTU 1800HP, recent 2022 refit, 5 cabins"
    }
  ]
}

RULES:
- The comparables array must have EXACTLY 5 entries from real listings you visited
- If you cannot find 5 real matches within the strict criteria, widen year range by ±1 year and search again
- Set confidence to "low" if you had to widen search criteria significantly
- DO NOT include vessel names, owner names, flag, or registration country
- DO NOT include brokerage / broker / listing-agent / dealer names anywhere in the output (not in "builder", not in "model", not in "note", not in "reasoning"). The "builder" field MUST contain ONLY the shipyard name (e.g. "Sunseeker", "Azimut", "Princess") — NEVER prefixes/suffixes like "(listed by …)", "via …", "broker …", or names of platforms (YachtWorld, RightBoat, boats.com, TheYachtMarket, etc.). The "note" may reference geography only at country level (e.g. "US market", "Mediterranean") if relevant.
- DO NOT invent pricing — every price must come from a real listing or confirmed sale`;

    let result: Record<string, unknown>;

    try {
      const rawText = await aiResponses(prompt, "gpt-5-mini", [
        { type: "web_search_preview" },
      ]);
      if (!rawText) throw new Error("Empty response");
      result = extractJson(rawText);
    } catch (primaryErr) {
      console.warn(
        "Responses API failed, using chat completions:",
        primaryErr instanceof Error ? primaryErr.message : primaryErr
      );
      const fallbackPrompt = `You are an expert superyacht market appraiser with deep knowledge of the global brokerage market.

TARGET VESSEL:
${specs}
${regionBlock}${vatBlock}

${modeNote}

Based on your knowledge of comparable vessels sold or listed on YachtWorld, RightBoat, Boat24 and similar platforms, provide 5 real comparable examples that closely match the target vessel (same type, ±3 years, ±15% length, similar engines if specified).

⚠ CRITICAL — OPEN MARKET LISTING EQUIVALENT:
Your "estimated_price" represents the OPEN-MARKET LISTING EQUIVALENT — i.e. the price this vessel would currently be listed at on YachtWorld / RightBoat / TheYachtMarket alongside the comparables. This is the ASKING-price equivalent, NOT the discounted sold price. Do NOT subtract a generic asking→sold haircut. Compute it as a weighted average of the comparable asking prices, biased toward the closest matches (same builder/model = highest weight, then same year, then same length/engine layout). Adjust up or down for the target's spec advantages or disadvantages vs the cohort. The downstream system applies separate discounts to derive Discreet Sale (≈ −25%) and Quick Sale (≈ −35%) tiers, so do NOT bake those into your number.

All prices (estimated_price and each comparable's price) MUST be returned in canonical EUR format: "€ X,XXX,XXX" (e.g. "€ 5,200,000"). Do NOT use shorthand like "€ 5.2M", "5200K", or currency codes like "EUR 5200000".

Return ONLY valid JSON, no markdown:
{
  "estimated_price": "€ X,XXX,XXX",
  "confidence": "low",
  "reasoning": "3–4 sentences citing comparable vessels and explaining how the target's specs affect its value relative to them.",
  "comparables": [
    {
      "builder": "Builder name",
      "model": "Model/Series",
      "year": 2018,
      "length": "28m",
      "condition": "Good",
      "price": "€ 2,800,000",
      "note": "Key spec differences vs target vessel"
    }
  ]
}
Comparables array must have EXACTLY 5 entries. DO NOT include vessel names, owner names or flag. DO NOT include brokerage / broker / listing-agent / dealer / platform names anywhere — "builder" must contain ONLY the shipyard name (e.g. "Sunseeker"), never "(listed by …)" or similar.`;

      const raw = await aiChat([
        {
          role: "system",
          content:
            "You are an expert superyacht market appraiser. Reply ONLY with valid JSON, no markdown.",
        },
        { role: "user", content: fallbackPrompt },
      ]);
      result = extractJson(raw);
    }

    if (typeof result.reasoning === "string") {
      result.reasoning = cleanReasoning(result.reasoning);
    }
    if (Array.isArray(result.comparables)) {
      result.comparables = (result.comparables as any[]).map((c) => ({
        ...c,
        note: cleanReasoning(c?.note),
      }));
    }

    // ── Post-processing: sanity check + distressed scenarios ──────────────
    const lengthRaw = parseFloat(
      String(b.length ?? "").replace(/[^\d.]/g, "")
    );
    const lengthMeters =
      isFinite(lengthRaw) && lengthRaw > 0
        ? units === "imperial"
          ? lengthRaw / 3.28084
          : lengthRaw
        : null;

    let aiPriceEur = parsePriceEur(result.estimated_price);
    let sanityAdjusted = false;
    let aiOriginalPriceEur: number | null = null;
    let sanityBandLowEur: number | null = null;
    let sanityBandHighEur: number | null = null;
    let sanityBandLabel: string | null = null;
    let sanityPerMeterEur: number | null = null;
    let confidence = String(result.confidence || "low") as
      | "high"
      | "medium"
      | "low";

    if (aiPriceEur && lengthMeters) {
      const check = sanityCheckPrice(
        aiPriceEur,
        lengthMeters,
        String(b.type || ""),
        String(b.configuration || "")
      );
      if (!check.ok) {
        aiOriginalPriceEur = Math.round(aiPriceEur);
        sanityPerMeterEur = Math.round(check.perMeter);
        sanityBandLowEur = Math.round(check.range[0] * lengthMeters);
        sanityBandHighEur = Math.round(check.range[1] * lengthMeters);
        sanityBandLabel = check.rangeKey;
        aiPriceEur = check.clampedEur;
        sanityAdjusted = true;
        confidence = "low";
      }
    }

    // ---- Confidence floor based on data completeness ----------------------
    // Server-authoritative: even if the AI ignores the prompt instruction,
    // we never let confidence exceed what the data supports.
    const rank: Record<string, number> = { low: 0, medium: 1, high: 2 };
    const cap = (max: "low" | "medium" | "high") => {
      if (rank[confidence] > rank[max]) confidence = max;
    };
    if (completeness.score < 30) cap("low");
    else if (completeness.score < 50) cap("medium");
    else if (completeness.score < 70 && dbMatches.length < 3) cap("medium");

    // If user opted out of providing full data via the "I don't have all data"
    // checkbox, force confidence to "low" regardless of what the AI returned.
    if (b.bypass_required === true) cap("low");

    // ── Condition adjustment (deterministic, server-authoritative) ─────────
    // AI was instructed to price as if Excellent. We apply the multiplier
    // here so condition is reflected exactly once. If condition is empty
    // (user opted out via the bypass-checkbox), multiplier = 1.00 and we
    // cap confidence so the user sees the gap.
    const conditionRaw =
      typeof b.condition === "string" ? b.condition.trim() : "";
    const conditionMultiplier = conditionMultiplierFor(conditionRaw);
    const conditionAdjustmentPct = Math.round(
      (conditionMultiplier - 1) * 100
    );
    const aiPriceBeforeConditionEur = aiPriceEur ? Math.round(aiPriceEur) : null;
    if (aiPriceEur && conditionMultiplier !== 1.0) {
      aiPriceEur = aiPriceEur * conditionMultiplier;
    }
    if (!conditionRaw) {
      // Missing condition signal → cap confidence so the user sees the gap.
      cap("medium");
    }

    let marketPriceStr: string;
    let distressedPriceStr = "";
    let quickSalePriceStr = "";
    let estimatedPriceEur: number | null = null;

    if (aiPriceEur) {
      estimatedPriceEur = Math.round(aiPriceEur);
      marketPriceStr = formatEur(aiPriceEur);
      // Distressed scenario discounts (off the condition-adjusted price):
      //   distressed (−20%) — motivated/forced seller, 2–4 month timeline,
      //                       middle of industry distressed band (18–28%).
      //   quick_sale (−30%) — receiver / fire sale, 30–60 day disposal,
      //                       middle of industry fire-sale band (30–40%).
      // Percentages deliberately NOT surfaced in the UI labels.
      distressedPriceStr = formatEur(aiPriceEur * 0.8);
      quickSalePriceStr = formatEur(aiPriceEur * 0.7);
    } else {
      // Fallback: keep AI's original string if we couldn't parse.
      marketPriceStr = String(result.estimated_price || "");
    }

    const finalResult = {
      ...result,
      estimated_price: marketPriceStr,
      market_price: marketPriceStr,
      distressed_price: distressedPriceStr,
      quick_sale_price: quickSalePriceStr,
      estimated_price_eur: estimatedPriceEur,
      currency: "EUR",
      confidence,
      sanity_adjusted: sanityAdjusted,
      sanity_ai_original_price_eur: aiOriginalPriceEur,
      sanity_band_low_eur: sanityBandLowEur,
      sanity_band_high_eur: sanityBandHighEur,
      sanity_band_label: sanityBandLabel,
      sanity_per_meter_eur: sanityPerMeterEur,
      internal_comparables_count: dbMatches.length,
      completeness_score: completeness.score,
      completeness_filled: completeness.filled,
      completeness_total: completeness.total,
      completeness_missing_critical: completeness.missing_critical,
      sale_region: regionKey || null,
      sale_region_label: regionKey ? REGION_LABELS[regionKey] || regionKey : null,
      vat_status: vatKey || null,
      // Condition adjustment audit fields. Frontend uses these to render the
      // "Condition adjustment: Fair (−17%)" line under market price.
      condition: conditionRaw || null,
      condition_multiplier: conditionMultiplier,
      condition_adjustment_pct: conditionAdjustmentPct,
      condition_baseline_eur: aiPriceBeforeConditionEur,
    };

    // Fire-and-forget: log every request for future ML training data.
    // Never blocks the response.
    void runValuationMigration()
      .then(() =>
        db().query(
          `INSERT INTO valuation_requests
             (input, output, ip, confidence, estimated_price_eur, sanity_adjusted, completeness_score)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            JSON.stringify(b),
            JSON.stringify(finalResult),
            req.ip || null,
            confidence,
            estimatedPriceEur,
            sanityAdjusted,
            completeness.score,
          ]
        )
      )
      .catch((e) =>
        console.error(
          "[valuation] log save failed:",
          e instanceof Error ? e.message : e
        )
      );

    res.json(finalResult);
  } catch (err) {
    console.error("Valuation error:", err);
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : "Valuation failed" });
  }
});

export default router;
