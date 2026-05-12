# YachtWorth — Replit-Ready AI Prompt Specification v2.0

> **CRITICAL CHANGES FROM v1.0:**
> - "Valuation" → "Estimate" everywhere (legal compliance)
> - Enhanced disclaimers and liability protection
> - Stale data detection layer
> - Improved free tier UX (3 estimates vs 1)
> - B2B broker mode support
> - GDPR/privacy compliance hooks

---

## Model & API Configuration

```typescript
const AI_CONFIG = {
  model: "gpt-5-mini",
  endpoint: "https://api.openai.com/v1/responses",
  fallbackEndpoint: "https://api.openai.com/v1/chat/completions",
  tools: [{ type: "web_search_preview" }],
  maxTokens: 4000,
  temperature: 0.2,  // Low creativity for factual accuracy
};
```

---

## BLOCK 0 — Legal Disclaimer (INJECTED FIRST)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LEGAL FRAMEWORK & LIABILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are generating a MARKET ESTIMATE for informational purposes only.

REQUIRED DISCLAIMERS (must be reflected in output reasoning):
1. This is an "Indicative Market Estimate" — NOT a certified appraisal, valuation, or survey.
2. Not suitable for financing, insurance, legal proceedings, or tax purposes.
3. For certified appraisal, consult a licensed marine surveyor (e.g., RICS, IYBA, or national equivalent).
4. All prices reflect ASKING prices of comparable listings, not confirmed sale prices.
5. Market conditions change; estimate validity: 30 days maximum.

TERMINOLOGY RULE:
- Use ONLY "estimate", "market reference", "price indication"
- NEVER use "valuation", "appraisal", "certified value", "fair market value" in output text
- The product is "YachtWorth Market Estimate" — never "YachtWorth Valuation"
```

---

## BLOCK 1 — User Intent & Tier Detection

```typescript
interface UserContext {
  tier: "free" | "basic" | "pro" | "broker";  // From subscription
  estimatesUsedThisMonth: number;
  estimatesRemaining: number;
  userId: string | null;  // null = guest
  isBrokerAccount: boolean;
  whiteLabelBrokerName?: string;  // For B2B white-label PDF
}

const TIER_CONFIG = {
  free: { maxEstimates: 3, history: false, pdf: false, comparables: 3, reasoningLength: "2_sentences" },
  basic: { maxEstimates: 15, history: true, pdf: true, comparables: 3, reasoningLength: "2_sentences" },
  pro: { maxEstimates: Infinity, history: true, pdf: true, comparables: 5, reasoningLength: "3_sentences" },
  broker: { maxEstimates: Infinity, history: true, pdf: true, comparables: 5, reasoningLength: "3_sentences", whiteLabel: true },
};
```

---

## BLOCK 2 — Target Vessel Specifications

```typescript
function buildSpecsBlock(b: FormInput, units: "metric" | "imperial"): string {
  const unitNote = units === "imperial" ? " ft" : " m";
  const tonneLabel = units === "imperial" ? " LT" : " tonnes";

  return [
    b.type && `Vessel type: ${b.type}`,
    b.configuration && `Configuration / style: ${b.configuration}`,
    b.mode === "builder" && b.builder ? `Builder/shipyard: ${b.builder}` : null,
    b.mode === "builder" && b.model ? `Model/series: ${b.model}` : null,
    b.year && `Build year: ${b.year}`,
    b.refit && `Refit year: ${b.refit}`,
    b.condition && `Condition (for reference only): ${b.condition}`,
    b.length && `Length overall (LOA): ${b.length}${unitNote}`,
    b.beam && `Beam: ${b.beam}${unitNote}`,
    b.draft && `Draft: ${b.draft}${unitNote}`,
    b.displacement && `Displacement: ${b.displacement}${tonneLabel}`,
    b.gross_tonnage && `Gross tonnage: ${b.gross_tonnage} GT`,
    b.hull_material && `Hull material: ${b.hull_material}`,
    b.hull_type && `Hull type: ${b.hull_type}`,
    b.engines && `Propulsion configuration: ${b.engines}`,
    b.engine_count && `Number of engines: ${b.engine_count}`,
    b.engine_maker && `Engine manufacturer: ${b.engine_maker}`,
    b.engine_model && `Engine model/series: ${b.engine_model}`,
    b.horse_power && `Total horsepower: ${b.horse_power} HP`,
    b.fuel_type && `Fuel type: ${b.fuel_type}`,
    b.fuel_capacity && `Fuel capacity: ${b.fuel_capacity}${units === "imperial" ? " gal" : " L"}`,
    b.water_capacity && `Water capacity: ${b.water_capacity}${units === "imperial" ? " gal" : " L"}`,
    b.max_speed && `Maximum speed: ${b.max_speed} kts`,
    b.cruise_speed && `Cruise speed: ${b.cruise_speed} kts`,
    b.range && `Cruising range: ${b.range} nm`,
    b.cabins && `Guest cabins: ${b.cabins}`,
    b.heads && `Heads (WC): ${b.heads}`,
    b.berths && `Total berths: ${b.berths}`,
    b.crew && `Crew capacity: ${b.crew}`,
    b.sale_region && `Intended sale region: ${REGION_LABELS[b.sale_region]}`,
    b.vat_status && `VAT/Tax status: ${b.vat_status === "paid" 
      ? "VAT PAID (EU free circulation — price includes ~20% VAT)" 
      : "VAT NOT PAID (offshore / outside EU free circulation — buyer pays import VAT separately)"}`,
  ].filter(Boolean).join("\n");
}
```

---

## BLOCK 3 — Data Completeness Engine

```typescript
const COMPLETENESS_WEIGHTS: Record<string, number> = {
  // Critical fields (45 points)
  type: 15,
  year: 15,
  length: 15,

  // Identity/brand (24 points, builder mode only)
  builder: 10,
  model: 8,
  configuration: 6,

  // Propulsion (15 points)
  engine_maker: 4,
  engine_model: 2,
  horse_power: 5,
  engines: 2,
  engine_count: 2,

  // Hull & mass (12 points)
  gross_tonnage: 4,
  hull_material: 3,
  displacement: 3,
  beam: 2,

  // Condition & refit (8 points)
  condition: 5,
  refit: 3,

  // Performance & capacity (10 points)
  draft: 1,
  fuel_type: 1,
  fuel_capacity: 2,
  max_speed: 2,
  cruise_speed: 1,
  range: 2,
  cabins: 1,

  // Misc (collected but low weight)
  hull_type: 1,
  heads: 0,
  berths: 0,
  crew: 1,
  water_capacity: 0,
};

interface CompletenessResult {
  score: number;        // 0–100
  filled: number;
  total: number;
  missingCritical: string[];
  missingHighImpact: string[];
  boostToNextLevel: {    // Gamification: what fields to fill for better confidence
    targetConfidence: "medium" | "high";
    fieldsNeeded: { field: string; weight: number; label: string }[];
    potentialScoreIncrease: number;
  } | null;
}

function computeCompleteness(b: FormInput, mode: string): CompletenessResult {
  let earned = 0, possible = 0, filled = 0, total = 0;
  const missingCritical: string[] = [];
  const missingHighImpact: string[] = [];

  const CRITICAL_FIELDS = ["type", "year", "length"];
  const HIGH_IMPACT_FIELDS = ["builder", "model", "configuration", "engine_maker", "horse_power", "condition"];

  for (const [field, weight] of Object.entries(COMPLETENESS_WEIGHTS)) {
    if ((field === "builder" || field === "model") && mode !== "builder") continue;

    possible += weight;
    total++;

    const value = b[field as keyof FormInput];
    const isFilled = value !== undefined && value !== null && String(value).trim() !== "";

    if (isFilled) {
      earned += weight;
      filled++;
    } else {
      if (CRITICAL_FIELDS.includes(field)) missingCritical.push(field);
      if (HIGH_IMPACT_FIELDS.includes(field) && weight >= 4) missingHighImpact.push(field);
    }
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  // Calculate boost to next confidence level
  let boostToNextLevel = null;
  if (score < 30) {
    // Need to reach 30% for "medium"
    const needed = 30 - score;
    const fields = missingHighImpact
      .map(f => ({ field: f, weight: COMPLETENESS_WEIGHTS[f], label: FIELD_LABELS[f] }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
    boostToNextLevel = { targetConfidence: "medium", fieldsNeeded: fields, potentialScoreIncrease: needed };
  } else if (score < 50) {
    // Need to reach 50% for "high" eligibility
    const needed = 50 - score;
    const fields = missingHighImpact
      .map(f => ({ field: f, weight: COMPLETENESS_WEIGHTS[f], label: FIELD_LABELS[f] }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
    boostToNextLevel = { targetConfidence: "high", fieldsNeeded: fields, potentialScoreIncrease: needed };
  }

  return { score, filled, total, missingCritical, missingHighImpact, boostToNextLevel };
}

const FIELD_LABELS: Record<string, string> = {
  builder: "Builder/shipyard",
  model: "Model/series",
  configuration: "Configuration (Flybridge/Open/etc.)",
  engine_maker: "Engine manufacturer",
  horse_power: "Total horsepower",
  condition: "Current condition",
  refit: "Refit year",
  gross_tonnage: "Gross tonnage",
  hull_material: "Hull material",
  displacement: "Displacement",
};
```

---

## BLOCK 4 — Regional Cohort Filter

```typescript
const REGION_LABELS: Record<string, string> = {
  mediterranean: "Mediterranean (FR, IT, ES, MC, GR, HR, TR, MT)",
  northern_europe: "Northern Europe incl. UK (UK, NL, DE, DK, NO, SE, FI, BE)",
  north_america_caribbean: "North America & Caribbean (US, CA, BS, KY, BVI, USVI, ATG)",
  asia_pacific_me: "Asia-Pacific & Middle East (AE, SG, HK, TH, AU, NZ, JP, CN)",
  global: "Global (no regional restriction)",
};

const REGION_GUIDANCE: Record<string, string> = {
  mediterranean: `
    HARD FILTER: Only use comparables from Mediterranean basin.
    Valid markets: French Riviera, Italy (incl. Sardinia), Spain (incl. Balearics), 
    Monaco, Greece, Croatia, Turkey, Malta.

    Price context: Mediterranean asking prices typically 5–15% ABOVE US asking prices 
    for equivalent tonnage. Do NOT substitute US or Caribbean listings.

    Search queries: "[builder] [model] for sale Monaco|France|Italy|Spain|Greece|Croatia"
  `,
  northern_europe: `
    HARD FILTER: Only use comparables from Northern Europe.
    Valid markets: UK, Netherlands, Germany, Denmark, Norway, Sweden, Finland, Belgium.
    Primary brokerages: Sunseeker UK, Princess, Burgess UK, Edmiston UK, De Valk NL.
    Do NOT substitute Mediterranean or US listings.
  `,
  north_america_caribbean: `
    HARD FILTER: Only use comparables from US, Canada, Caribbean.
    Valid markets: Florida, California, Northeast US, Bahamas, Cayman, BVI, USVI, Antigua, St Maarten.
    USD listings expected — convert to EUR at current spot rate.
    US asking prices typically 5–15% LOWER than Med for equivalent tonnage.
    Do NOT substitute Mediterranean or Northern European listings.
  `,
  asia_pacific_me: `
    HARD FILTER: Only use comparables from APAC/ME.
    Valid markets: UAE (Dubai, Abu Dhabi), Saudi, Qatar, Singapore, Hong Kong, 
    Thailand (Phuket), Australia, New Zealand, Japan, China.

    THIN MARKET PROTOCOL: If <4 region-matched comparables after 2 search refinements:
    1. Include up to 2 Mediterranean comparables (mark as "cross-region")
    2. Set confidence to "low"
    3. State thin market explicitly in reasoning
  `,
  global: `
    No regional restriction. Accept comparables from any major brokerage market.
    In reasoning, explicitly state which markets comparables came from.
  `,
};

function buildRegionBlock(regionKey: string): string {
  if (!regionKey || !REGION_GUIDANCE[regionKey]) return "";

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGIONAL MARKET FILTER — ${REGION_LABELS[regionKey].toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target vessel intended for sale in: ${REGION_LABELS[regionKey]}.

${REGION_GUIDANCE[regionKey]}

ENFORCEMENT: A vessel in Florida is NOT a comparable for Mediterranean estimate,
even with identical specs. Location defines market liquidity, buyer pool, and pricing.
  `;
}
```

---

## BLOCK 5 — VAT/Tax Status Cohort Filter

```typescript
function buildVatBlock(vatStatus: "paid" | "not_paid" | undefined): string {
  if (!vatStatus) return "";

  const isPaid = vatStatus === "paid";

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VAT/TAX STATUS FILTER — ${isPaid ? "VAT PAID" : "VAT NOT PAID"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target vessel: ${isPaid 
  ? "VAT PAID — cleared EU import VAT, trades in EU free circulation. Price INCLUDES ~20% VAT."
  : "VAT NOT PAID — offshore-flagged or outside EU free circulation. Buyer pays import VAT (~17–22%) ON TOP of asking price."}

STRUCTURAL MARKET DIFFERENCE:
These are DIFFERENT markets — NOT a percentage adjustment. Matching criteria:

${isPaid ? `
✓ USE ONLY: Listings explicitly tagged "VAT paid" / "EU VAT paid" / "TVA payée"
✗ REJECT: Listings with no VAT info, "VAT not paid", "ex-VAT", "offshore"
✗ REJECT: Vessels in non-EU waters without explicit "VAT paid" statement

Indicators of VAT PAID:
- Location: EU waters (FR, IT, ES, NL, DE, MT, GR)
- Flag: EU flag (FR, IT, ES, NL, DE, MT, GR)
- Listing states: "VAT paid", "EU VAT paid", "TVA payée", "IVA pagata"
` : `
✓ USE ONLY: Listings explicitly tagged "VAT not paid" / "offshore" / "ex-VAT" / "TVA non payée"
✗ REJECT: Listings tagged "VAT paid" — their prices include ~20% VAT and would INFLATE estimate

Indicators of VAT NOT PAID:
- Location: Non-EU waters (Caribbean, US, Turkey non-EU, UAE, Singapore, Hong Kong)
- Flag: Cayman Islands, Marshall Islands, BVI, Jersey, Isle of Man, Bermuda
- Listing states: "VAT not paid", "ex-VAT", "offshore", "TVA non payée"
`}

HARD FILTER RULE: Do NOT "adjust" opposite-VAT-status listings by ±20%.
Different buyer pools, liquidity, and ask-to-sale spreads make this statistically invalid.

THIN COHORT PROTOCOL: If <4 same-VAT-status comparables after 2 search refinements:
1. Set confidence to "low"
2. State thin cohort explicitly in reasoning
3. Use only same-VAT-status comparables found — do NOT pad with opposite-status

REQUIRED: Mention VAT status of cohort explicitly in reasoning field.
  `;
}
```

---

## BLOCK 6 — Stale Data Detection Layer

```typescript
interface ListingFreshness {
  isFresh: boolean;
  confidenceReduction: number;  // 0 = fresh, 0.3 = possibly stale, 0.5 = likely stale
  reason: string;
}

function assessListingFreshness(
  listingSnippet: string,
  listingDate: string | null,
  priceHistory: number[] | null
): ListingFreshness {
  const now = new Date();

  // Check 1: Explicit listing date
  if (listingDate) {
    const listed = new Date(listingDate);
    const daysSinceListed = (now.getTime() - listed.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceListed > 180) {
      return { isFresh: false, confidenceReduction: 0.4, reason: `Listed ${Math.round(daysSinceListed)} days ago — may be stale or sold` };
    }
    if (daysSinceListed > 90) {
      return { isFresh: true, confidenceReduction: 0.15, reason: `Listed ${Math.round(daysSinceListed)} days ago — verify active` };
    }
  }

  // Check 2: Snippet indicators
  const staleIndicators = [
    "price reduced", "reduced", "was €", "originally", "motivated seller",
    "urgent sale", "must sell", "reduced for quick sale"
  ];
  const freshIndicators = [
    "new listing", "just listed", "fresh to market", "new to market",
    "recently listed", "new instruction"
  ];

  const snippetLower = listingSnippet.toLowerCase();

  if (staleIndicators.some(i => snippetLower.includes(i))) {
    return { isFresh: false, confidenceReduction: 0.3, reason: "Price reduction history detected — may indicate stale listing" };
  }

  if (freshIndicators.some(i => snippetLower.includes(i))) {
    return { isFresh: true, confidenceReduction: 0, reason: "Recently listed — fresh data" };
  }

  // Check 3: Price volatility
  if (priceHistory && priceHistory.length >= 2) {
    const maxPrice = Math.max(...priceHistory);
    const minPrice = Math.min(...priceHistory);
    const volatility = (maxPrice - minPrice) / maxPrice;

    if (volatility > 0.25) {
      return { isFresh: false, confidenceReduction: 0.35, reason: `High price volatility (${(volatility * 100).toFixed(0)}% reduction history) — verify current status` };
    }
  }

  // Default: unknown freshness, slight penalty
  return { isFresh: true, confidenceReduction: 0.1, reason: "Listing freshness unverified — treat with caution" };
}

// Injected into prompt:
const STALE_DATA_INSTRUCTIONS = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA FRESHNESS PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For EACH comparable found, assess freshness before inclusion:

FRESH (use with full weight):
- Listed within 90 days
- Explicitly marked "new listing" / "fresh to market"
- No price reduction history

VERIFY (use with 85% weight, note in reasoning):
- Listed 90–180 days ago
- No explicit freshness indicators
- Single price point, no history

STALE (use with 60% weight OR exclude if better alternatives exist):
- Listed >180 days ago
- Multiple price reductions detected
- Phrases: "motivated seller", "was €X, now €Y", "urgent sale"
- High price volatility (>25% from original ask)

If >2 of 5 comparables are STALE, set overall confidence to "medium" or "low".
Explicitly state freshness assessment in reasoning for each comparable.
`;
```

---

## BLOCK 7 — Main Prompt Template

```
You are a professional yacht market analyst generating an INDICATIVE MARKET ESTIMATE.
This is NOT a certified appraisal. You have access to live yacht listing databases via web search.

{LEGAL_DISCLAIMER_BLOCK}

TARGET VESSEL SPECIFICATIONS:
{SPECS_BLOCK}

{COMPLETENESS_BLOCK}
{REGION_BLOCK}
{VAT_BLOCK}
{STALE_DATA_INSTRUCTIONS}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEARCH PROTOCOL — STEP 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Perform iterative web searches across platforms:
- YachtWorld (yachtworld.com) — PRIMARY source for 18m+ vessels
- RightBoat (rightboat.com) — Strong for EU listings, VAT status often explicit
- Boat24 (boat24.com) — European volume market
- Apollo Duck (apolloduck.com) — Budget/older vessels
- TheYachtMarket (theyachtmarket.com) — UK-focused
- YachtBroker (yachtbroker.com) — Mediterranean specialist
- Fraser Yachts (fraseryachts.com) — Superyacht 24m+
- Burgess (burgessyachts.com) — Superyacht 24m+

Search query hierarchy (use strongest available):
1. "[builder] [model] for sale [year] [region]" — STRONGEST
2. "[builder] [model] [configuration] for sale [region]"
3. "[type] [configuration] [length]m for sale [year] [region]"
4. "[length]m [type] [year] for sale EUR [region]"
5. "[engine_maker] [engine_model] yacht for sale [region]"

For each search result, VISIT the actual listing page to verify:
- Exact specs (year, length, engines, cabins)
- Confirmed asking price
- VAT status (explicit statement)
- Listing date / freshness indicators
- Location (must match regional filter)

CRITICAL: Builder + Model = unique product identity.
"Sunseeker Predator 60" (sport) ≠ "Sunseeker Manhattan 60" (flybridge)
Configuration (Flybridge/Open/Coupé/Sloop) = price-defining. Never substitute.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATCHING CRITERIA — STEP 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comparable MUST satisfy ALL:
✓ Same or directly adjacent vessel type
✓ Build year within {YEAR_RANGE} (±3 years, expandable to ±4 if needed)
✓ Length within ±15% of target
✓ Same configuration/style (flybridge≠open, sloop≠ketch)
✓ Similar engine setup (if specified: same maker or same config)
✓ Price confirmed: asking price or verified sold price
✗ NEVER use year-only match without length match
✗ NEVER fabricate data — only verified listing page data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRESHNESS VALIDATION — STEP 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For each candidate:
1. Check listing date (prefer <90 days)
2. Check for price reduction history
3. Check location matches regional filter
4. Check VAT status matches cohort filter
5. If any check fails, reduce weight or discard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTIMATE CALCULATION — STEP 4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{MODE_NOTE}

Based on {COMPARABLE_COUNT} verified comparable listings, calculate the INDICATIVE MARKET ESTIMATE.

⚠ CRITICAL — OPEN MARKET LISTING EQUIVALENT:
Your "estimated_price" is the ASKING-PRICE equivalent — what this vessel would be listed at 
on YachtWorld/RightBoat TODAY, alongside the comparables. NOT a discounted sold price.
NOT a "fair market value" for legal purposes.

Calculation method:
1. Start with weighted average of comparable asking prices
2. Weight factors (in order): same builder+model > same year > same length > same engines
3. Adjust for target vessel's spec advantages/disadvantages vs cohort:
   - Newer/older: ±3–5% per year (within range)
   - More/fewer engines: ±5–10%
   - Refit history: +5–15% if recent (within 2 years)
   - Hull material: carbon fibre +10–20%, steel −5–10% vs GRP baseline
4. Do NOT adjust for condition — system handles that separately
5. Do NOT apply regional or VAT percentage adjustments — cohort already filtered

The downstream system applies:
- Condition multiplier (separate, deterministic)
- Discreet Sale scenario (−20% from condition-adjusted price)
- Quick Sale scenario (−30% from condition-adjusted price)

Your output is ONLY the open-market, excellent-condition baseline.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — JSON ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON. No markdown, no text before/after, no explanations outside JSON.

{
  "estimated_price": "€ X,XXX,XXX",
  "confidence": "high|medium|low",
  "confidence_reason": "One sentence: why this confidence level (data completeness, comparable quality, market liquidity)",
  "reasoning": "{REASONING_LENGTH}: Cite comparables found, explain target vessel position vs cohort, mention any data gaps or market thinness. Use 'estimate' terminology only. NEVER use 'valuation', 'appraisal', 'fair market value'.",
  "legal_disclaimer": "This indicative market estimate is for informational purposes only and does not constitute a certified appraisal or valuation. Not suitable for financing, insurance, or legal proceedings. Consult a licensed marine surveyor for certified appraisal. Estimate based on comparable listing analysis as of [DATE].",
  "data_quality": {
    "completeness_score": {SCORE},
    "completeness_filled": {FILLED},
    "completeness_total": {TOTAL},
    "freshness_assessment": "All comparables verified fresh | Some comparables potentially stale | Thin market, limited comparables"
  },
  "comparables": [
    {
      "builder": "Shipyard name ONLY (no broker/platform names)",
      "model": "Model/series from listing",
      "year": 2018,
      "length": "28.5m",
      "condition": "Good|Excellent|Fair",
      "price": "€ 2,850,000",
      "price_freshness": "fresh|verify|stale",
      "price_freshness_reason": "Listed 45 days ago, no reductions",
      "note": "Spec differences vs target: twin MTU 1800HP, 2022 refit, 5 cabins. Location: Mediterranean."
    }
  ],
  "scenarios": {
    "open_market": "€ X,XXX,XXX",
    "discreet_sale": "€ X,XXX,XXX",
    "quick_sale": "€ X,XXX,XXX"
  }
}

RULES:
- comparables array: EXACTLY {COMPARABLE_COUNT} entries
- If insufficient matches: widen year to ±4, reduce to {COMPARABLE_COUNT} best matches, set confidence "low"
- NEVER include: vessel names, owner names, flag, registration, broker names, platform names
- "builder" field: shipyard ONLY. NEVER: "(listed by Fraser)", "via Burgess", "YachtWorld", etc.
- "note" field: geography at country level max ("US market", "Mediterranean"). No city/marina names.
- All prices: canonical EUR format "€ X,XXX,XXX". NEVER: "€ 5.2M", "5200K", "EUR 5200000"
- Every price MUST come from verified listing page
```

---

## BLOCK 8 — Fallback Prompt (no web search)

```typescript
const FALLBACK_PROMPT = `
You are an expert yacht market analyst. Generate an INDICATIVE MARKET ESTIMATE based on 
training data knowledge of yacht sales and listings.

{LEGAL_DISCLAIMER_BLOCK}

TARGET VESSEL:
{SPECS_BLOCK}
{REGION_BLOCK}
{VAT_BLOCK}

{MODE_NOTE}

Provide {COMPARABLE_COUNT} comparable examples from your knowledge of:
YachtWorld, RightBoat, Boat24, Fraser Yachts, Burgess sales history.

⚠ OPEN MARKET LISTING EQUIVALENT:
"estimated_price" = asking-price equivalent on major platforms today.
NOT sold price. NOT certified value. System applies condition + scenario adjustments separately.

All prices in canonical EUR: "€ X,XXX,XXX".

Return ONLY valid JSON:
{
  "estimated_price": "€ X,XXX,XXX",
  "confidence": "low",
  "confidence_reason": "Fallback mode without live data — based on training knowledge only",
  "reasoning": "{REASONING_LENGTH}: Based on historical market knowledge...",
  "legal_disclaimer": "This indicative market estimate is for informational purposes only...",
  "data_quality": {
    "completeness_score": {SCORE},
    "freshness_assessment": "Fallback mode — no live data verification"
  },
  "comparables": [
    {
      "builder": "Shipyard name ONLY",
      "model": "Model/Series",
      "year": 2018,
      "length": "28m",
      "condition": "Good",
      "price": "€ 2,800,000",
      "price_freshness": "unknown",
      "price_freshness_reason": "Based on training data — verify with live search",
      "note": "Key spec differences vs target"
    }
  ],
  "scenarios": {
    "open_market": "€ X,XXX,XXX",
    "discreet_sale": "€ X,XXX,XXX",
    "quick_sale": "€ X,XXX,XXX"
  }
}

EXACTLY {COMPARABLE_COUNT} comparables. NO broker/platform names. NO vessel/owner names.
`;
```

---

## BLOCK 9 — Server-Side Post-Processing Pipeline

```typescript
// ============================================================================
// STEP 1: Parse JSON
// ============================================================================
function extractJson(raw: string): any {
  const cleaned = raw
    .replace(/\`\`\`json\n?/gi, "")
    .replace(/\`\`\`\n?/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found");

  let depth = 0, inStr = false, escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1)); }
  }
  throw new Error("Unbalanced JSON");
}

// ============================================================================
// STEP 2: Parse price string → number
// ============================================================================
function parsePriceEur(s: unknown): number | null {
  if (typeof s !== "string") return null;
  let v = s.replace(/[^\d.,]/g, "");
  if (!v) return null;

  // Handle mixed separators
  if (v.includes(".") && v.includes(",")) {
    if (v.lastIndexOf(",") > v.lastIndexOf(".")) {
      v = v.replace(/\./g, "").replace(",", ".");  // EU format: 1.234,56 → 1234.56
    } else {
      v = v.replace(/,/g, "");  // US format: 1,234.56 → 1234.56
    }
  } else if (v.includes(",")) {
    const parts = v.split(",");
    if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
      v = v.replace(/,/g, "");  // US thousands
    } else {
      v = v.replace(",", ".");  // EU decimal
    }
  } else if (v.includes(".")) {
    const parts = v.split(".");
    if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
      v = v.replace(/\./g, "");  // EU thousands
    }
  }

  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : null;
}

// ============================================================================
// STEP 3: Sanity check (€/meter bands)
// ============================================================================
const PRICE_PER_METER_EUR: Record<string, [number, number]> = {
  "motor yacht / flybridge": [12000, 80000],
  "motor yacht / open / express": [10000, 70000],
  "motor yacht / hard top": [11000, 75000],
  "motor yacht / coupé": [12000, 90000],
  "motor yacht / sport yacht": [15000, 120000],
  "motor yacht / sport bridge": [14000, 100000],
  "motor yacht / pilothouse": [9000, 60000],
  "motor yacht / sedan": [8000, 55000],
  "motor yacht / convertible (sportfish)": [10000, 90000],
  "motor yacht / trawler": [6000, 40000],
  "motor yacht / long range / explorer": [25000, 400000],
  "motor yacht / motor gulet": [4000, 30000],
  "motor yacht / classic motor": [5000, 100000],
  "sailing yacht / sloop": [6000, 60000],
  "sailing yacht / ketch": [5000, 70000],
  "sailing yacht / cutter": [6000, 50000],
  "sailing yacht / schooner": [5000, 80000],
  "sailing yacht / yawl": [5000, 60000],
  "sailing yacht / cruiser-racer": [8000, 100000],
  "sailing yacht / performance cruiser": [10000, 120000],
  "sailing yacht / bluewater cruiser": [8000, 90000],
  "sailing yacht / classic sailing": [4000, 100000],
  "sailing yacht / sailing gulet": [4000, 25000],
  "catamaran / sail catamaran (cruising)": [10000, 80000],
  "catamaran / sail catamaran (performance)": [12000, 120000],
  "catamaran / power catamaran": [15000, 180000],
  "catamaran / charter catamaran": [8000, 60000],
  "superyacht / tri-deck motor": [60000, 500000],
  "superyacht / quad-deck motor": [80000, 800000],
  "superyacht / explorer / expedition": [80000, 800000],
  "superyacht / sport superyacht": [70000, 600000],
  "superyacht / classic motor superyacht": [40000, 400000],
  "superyacht / sailing superyacht": [50000, 500000],
  // Class-only fallbacks
  "motor yacht": [8000, 250000],
  "sailing yacht": [5000, 120000],
  "catamaran": [8000, 180000],
  "superyacht": [40000, 800000],
};

const PREMIUM_PRICE_PER_METER_EUR: Record<string, { minLength: number; range: [number, number] }> = {
  "motor yacht / flybridge": { minLength: 20, range: [60000, 250000] },
  "motor yacht / open / express": { minLength: 20, range: [55000, 220000] },
  "motor yacht / hard top": { minLength: 20, range: [60000, 230000] },
  "motor yacht / coupé": { minLength: 20, range: [70000, 250000] },
  "motor yacht / sport yacht": { minLength: 20, range: [70000, 280000] },
  "motor yacht / sport bridge": { minLength: 20, range: [70000, 250000] },
  "motor yacht / convertible (sportfish)": { minLength: 20, range: [60000, 250000] },
  "motor yacht / pilothouse": { minLength: 20, range: [50000, 200000] },
  "motor yacht / sedan": { minLength: 20, range: [45000, 180000] },
  "sailing yacht / performance cruiser": { minLength: 20, range: [50000, 250000] },
  "sailing yacht / bluewater cruiser": { minLength: 20, range: [40000, 200000] },
  "catamaran / power catamaran": { minLength: 18, range: [60000, 280000] },
  "catamaran / sail catamaran (performance)": { minLength: 18, range: [50000, 220000] },
  "catamaran / sail catamaran (cruising)": { minLength: 18, range: [40000, 180000] },
};

const DEFAULT_PRICE_PER_METER: [number, number] = [4000, 300000];

function sanityCheckPrice(
  priceEur: number,
  lengthMeters: number,
  type: string,
  configuration?: string
): { ok: boolean; clampedEur: number; range: [number, number]; rangeKey: string; isPremium: boolean; perMeter: number } {
  const t = String(type || "").toLowerCase().trim();
  const c = String(configuration || "").toLowerCase().trim();
  const fullKey = c ? `${t} / ${c}` : t;

  let range: [number, number];
  let rangeKey: string;
  let isPremium = false;

  const premium = PREMIUM_PRICE_PER_METER_EUR[fullKey];
  if (premium && lengthMeters >= premium.minLength) {
    range = premium.range;
    rangeKey = `${fullKey} (≥${premium.minLength}m premium)`;
    isPremium = true;
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
    return { ok: false, clampedEur: range[0] * lengthMeters, range, rangeKey, isPremium, perMeter };
  }
  if (perMeter > range[1]) {
    return { ok: false, clampedEur: range[1] * lengthMeters, range, rangeKey, isPremium, perMeter };
  }
  return { ok: true, clampedEur: priceEur, range, rangeKey, isPremium, perMeter };
}

// ============================================================================
// STEP 4: Confidence floor based on completeness
// ============================================================================
function capConfidence(
  aiConfidence: "high" | "medium" | "low",
  completenessScore: number,
  hasStaleComparables: boolean,
  sanityAdjusted: boolean
): "high" | "medium" | "low" {
  const rank = { low: 0, medium: 1, high: 2 };
  let confidence = aiConfidence;

  const cap = (max: "low" | "medium" | "high") => {
    if (rank[confidence] > rank[max]) confidence = max;
  };

  // Completeness caps
  if (completenessScore < 30) cap("low");
  else if (completenessScore < 50) cap("medium");
  else if (completenessScore < 70) cap("medium");

  // Data quality caps
  if (hasStaleComparables) cap("medium");
  if (sanityAdjusted) cap("low");

  return confidence;
}

// ============================================================================
// STEP 5: Condition multiplier (server-authoritative)
// ============================================================================
const CONDITION_MULTIPLIERS: Record<string, number> = {
  "New": 1.05,
  "Excellent": 1.00,
  "Good": 0.93,
  "Fair": 0.83,
  "Needs Refit": 0.70,
  "Project": 0.50,
};

function applyConditionMultiplier(priceEur: number, condition: string | null): {
  finalPrice: number;
  multiplier: number;
  adjustmentPct: number;
  baselineEur: number;
} {
  const multiplier = condition ? (CONDITION_MULTIPLIERS[condition.trim()] ?? 1.00) : 1.00;
  return {
    finalPrice: Math.round(priceEur * multiplier),
    multiplier,
    adjustmentPct: Math.round((multiplier - 1) * 100),
    baselineEur: Math.round(priceEur),
  };
}

// ============================================================================
// STEP 6: Scenario derivation
// ============================================================================
function deriveScenarios(conditionAdjustedPrice: number): {
  openMarket: string;
  discreetSale: string;
  quickSale: string;
} {
  return {
    openMarket: formatEur(conditionAdjustedPrice),
    discreetSale: formatEur(conditionAdjustedPrice * 0.80),  // -20%
    quickSale: formatEur(conditionAdjustedPrice * 0.70),     // -30%
  };
}

// ============================================================================
// STEP 7: Formatting
// ============================================================================
function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US");
}

// ============================================================================
// STEP 8: Clean reasoning text (remove markdown links, broker names)
// ============================================================================
function cleanReasoning(text: string): string {
  return text
    .replace(/\(\[([^\]]+)\]\([^)]+\)\)/g, "")  // Remove markdown links with text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")         // Keep link text only
    .replace(/\b(listed by|via|through|with)\s+[A-Z][a-zA-Z\s&]+(?:Yachts|Brokerage|Group)/gi, "")
    .replace(/\b(YachtWorld|RightBoat|Boat24|Apollo Duck|TheYachtMarket|Fraser|Burgess|Camper & Nicholsons)\b/gi, "")
    .trim();
}
```

---

## BLOCK 10 — Database Schema (GDPR-Compliant)

```sql
-- Valuation requests table (anonymized for ML training)
CREATE TABLE valuation_requests (
  id bigserial PRIMARY KEY,
  user_id uuid,                    -- NULL for guests (GDPR: minimize collection)
  session_id text,                 -- For guest tracking without PII
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  confidence text,
  estimated_price_eur numeric,
  sanity_adjusted boolean DEFAULT false,
  completeness_score int,
  model_version text DEFAULT 'gpt-5-mini-v1',
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10,6),
  created_at timestamptz DEFAULT now(),
  -- GDPR: auto-anonymize after 12 months
  anonymized_at timestamptz,
  anonymized boolean DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_valuation_user ON valuation_requests (user_id) WHERE anonymized = false;
CREATE INDEX idx_valuation_created ON valuation_requests (created_at);
CREATE INDEX idx_valuation_type ON valuation_requests ((input->>'type'));
CREATE INDEX idx_valuation_builder ON valuation_requests ((input->>'builder'));
CREATE INDEX idx_valuation_price ON valuation_requests (estimated_price_eur);

-- GDPR anonymization function (run monthly via cron)
CREATE OR REPLACE FUNCTION anonymize_old_valuations() RETURNS void AS $$
BEGIN
  UPDATE valuation_requests
  SET user_id = NULL,
      session_id = NULL,
      ip = NULL,
      anonymized = true,
      anonymized_at = now()
  WHERE created_at < now() - interval '12 months'
    AND anonymized = false;
END;
$$ LANGUAGE plpgsql;
```

---

## BLOCK 11 — Rate Limiting Configuration

```typescript
import { rateLimit } from "express-rate-limit";

const FREE_LIMITER = rateLimit({
  windowMs: 30 * 24 * 60 * 60 * 1000,  // 30 days
  max: 3,  // 3 estimates per month (was 1)
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: "Monthly estimate limit reached",
      upgradeUrl: "/subscribe",
      message: "Upgrade to Basic for 15 estimates/month or Pro for unlimited"
    });
  }
});

const BASIC_LIMITER = rateLimit({
  windowMs: 30 * 24 * 60 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.user?.id,
});

const PRO_LIMITER = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,  // 24 hours
  max: 100,  // Anti-abuse, not anti-use
  keyGenerator: (req) => req.user?.id,
});

const BROKER_LIMITER = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 500,  // Team usage
  keyGenerator: (req) => req.user?.id,
});

function getLimiterForTier(tier: string) {
  switch (tier) {
    case "free": return FREE_LIMITER;
    case "basic": return BASIC_LIMITER;
    case "pro": return PRO_LIMITER;
    case "broker": return BROKER_LIMITER;
    default: return FREE_LIMITER;
  }
}
```

---

## BLOCK 12 — Mobile App Response Shape

```typescript
interface EstimateResponse {
  // Core estimate
  estimated_price: string;           // "€ 2,860,000"
  confidence: "high" | "medium" | "low";
  confidence_reason: string;         // "One sentence explanation"

  // Legal
  legal_disclaimer: string;          // Full disclaimer text

  // Scenarios
  scenarios: {
    open_market: string;              // "€ 2,860,000"
    discreet_sale: string;            // "€ 2,288,000" (-20%)
    quick_sale: string;               // "€ 2,002,000" (-30%)
  };

  // Data quality transparency
  data_quality: {
    completeness_score: number;       // 47
    completeness_filled: number;        // 4
    completeness_total: number;       // 21
    freshness_assessment: string;     // "All comparables verified fresh"
  };

  // Condition adjustment (visible to user)
  condition_adjustment: {
    condition: string | null;          // "Good"
    multiplier: number;               // 0.93
    adjustment_pct: number;           // -7
    baseline_eur: number;             // 3075269 (before condition)
  };

  // Comparables (3 for mobile, 5 for Pro)
  comparables: Array<{
    builder: string;
    model: string;
    year: number;
    length: string;
    condition: string;
    price: string;
    price_freshness: "fresh" | "verify" | "stale";
    price_freshness_reason: string;
    note: string;
  }>;

  // Audit (for debugging, not shown to user)
  _audit: {
    sanity_adjusted: boolean;
    sanity_band_label: string | null;
    model_version: string;
    cost_usd: number;
  };

  // Gamification: boost to next confidence level
  _improve_accuracy?: {
    target_confidence: "medium" | "high";
    fields_needed: Array<{
      field: string;
      label: string;
      weight: number;
    }>;
    potential_score_increase: number;
  };
}
```

---

## BLOCK 13 — UI Copy Changes ("Valuation" → "Estimate")

```typescript
const UI_COPY = {
  // Home screen
  heroTitle: "Know your yacht's worth",
  heroSubtitle: "A professional AI market estimate in under a minute — built for owners and brokers.",
  ctaButton: "New estimate",  // was "New valuation"

  // Stats cards
  statsEstimatesUsed: "Estimates used",
  statsPlan: "Plan",
  statsRemaining: "Remaining",

  // History screen
  historyTitle: "Your estimates",  // was "Your valuations"
  historyEmpty: "Your yacht estimates will appear here.\nHistory is available on the Pro plan.",

  // Result screen
  resultTitle: "Market estimate",  // was "Valuation"
  resultSubtitle: "Indicative market reference based on comparable listings",

  // Scenarios
  scenarioOpenMarket: "Open market listing",
  scenarioDiscreet: "Discreet sale",
  scenarioQuick: "Quick sale",

  // Disclaimer (prominent, every result screen)
  disclaimer: "This is an indicative market estimate for informational purposes only. Not a certified appraisal. Not suitable for financing, insurance, or legal proceedings. Consult a licensed marine surveyor for certified valuation. Valid for 30 days.",

  // PDF
  pdfTitle: "YachtWorth Market Estimate",
  pdfWatermark: "For informational purposes only — not a certified appraisal",

  // Navigation
  navHome: "Home",
  navHistory: "History",
  navProfile: "Profile",
};
```

---

## BLOCK 14 — Testing Suite

```typescript
const SANITY_TEST_CASES = [
  {
    name: "22m Sunseeker Manhattan 70, 2018, Excellent, Mediterranean, VAT paid",
    input: { type: "motor yacht", builder: "Sunseeker", model: "Manhattan 70", year: 2018, length: 22, configuration: "flybridge", condition: "Excellent", sale_region: "mediterranean", vat_status: "paid" },
    expectedRange: [1800000, 2400000],
    expectedConfidence: "high",
  },
  {
    name: "35m Benetti Tradition, 2010, Good, Northern Europe, VAT paid",
    input: { type: "superyacht", builder: "Benetti", model: "Tradition", year: 2010, length: 35, configuration: "tri-deck motor", condition: "Good", sale_region: "northern_europe", vat_status: "paid" },
    expectedRange: [4500000, 6500000],
    expectedConfidence: "medium",
  },
  {
    name: "14m unknown sailing yacht, 1995, Needs Refit, Global, no VAT info",
    input: { type: "sailing yacht", builder: "Custom", year: 1995, length: 14, configuration: "sloop", condition: "Needs Refit", sale_region: "global", vat_status: undefined },
    expectedRange: [80000, 150000],  // After condition multiplier (baseline ~115-215k × 0.70)
    expectedConfidence: "low",
  },
  {
    name: "24m Azimut 80, 2018, Good, Global, VAT not paid",
    input: { type: "motor yacht", builder: "Azimut", model: "80", year: 2018, length: 24, configuration: "flybridge", condition: "Good", sale_region: "global", vat_status: "not_paid" },
    expectedRange: [2500000, 3200000],
    expectedConfidence: "medium",
  },
  {
    name: "18m Lagoon 620, 2015, Excellent, Caribbean, VAT not paid",
    input: { type: "catamaran", builder: "Lagoon", model: "620", year: 2015, length: 18, configuration: "sail catamaran (cruising)", condition: "Excellent", sale_region: "north_america_caribbean", vat_status: "not_paid" },
    expectedRange: [800000, 1400000],
    expectedConfidence: "medium",
  }
];

async function runSanityTests() {
  for (const test of SANITY_TEST_CASES) {
    const result = await generateEstimate(test.input);
    const price = parsePriceEur(result.estimated_price);
    const inRange = price >= test.expectedRange[0] && price <= test.expectedRange[1];
    const confidenceOk = result.confidence === test.expectedConfidence;

    console.log(`${inRange && confidenceOk ? "✅" : "❌"} ${test.name}`);
    if (!inRange) console.log(`   Price ${result.estimated_price} outside [${test.expectedRange[0]}, ${test.expectedRange[1]}]`);
    if (!confidenceOk) console.log(`   Confidence ${result.confidence}, expected ${test.expectedConfidence}`);

    // Verify no "valuation" or "appraisal" in output
    const outputJson = JSON.stringify(result).toLowerCase();
    if (outputJson.includes("valuation") || outputJson.includes("appraisal")) {
      console.log(`   ❌ ILLEGAL TERMINOLOGY DETECTED`);
    }
  }
}
```

---

## BLOCK 15 — Replit Deployment Checklist

```markdown
## Pre-Launch Checklist for Replit

### Environment Variables
- [ ] OPENAI_API_KEY — production key with rate limit monitoring
- [ ] DATABASE_URL — PostgreSQL (Replit Database or external)
- [ ] CLERK_SECRET_KEY — authentication
- [ ] CLERK_PUBLISHABLE_KEY — frontend auth
- [ ] STRIPE_SECRET_KEY — payments
- [ ] STRIPE_WEBHOOK_SECRET — subscription events

### Database
- [ ] Run migration: valuation_requests table
- [ ] Create indexes
- [ ] Set up monthly anonymization cron job

### Legal
- [ ] Terms of Service page (link in app + signup)
- [ ] Privacy Policy (GDPR-compliant)
- [ ] Cookie consent banner
- [ ] E&O insurance quote obtained

### Copy Review
- [ ] Zero instances of "valuation" or "appraisal" in UI
- [ ] All buttons say "estimate"
- [ ] Disclaimer visible on every result screen
- [ ] PDF watermark: "For informational purposes only"

### Rate Limiting
- [ ] Free: 3/month per user/IP
- [ ] Basic: 15/month per user
- [ ] Pro: 100/day per user
- [ ] Broker: 500/day per team

### Testing
- [ ] All 5 sanity test cases pass
- [ ] Stale data detection works
- [ ] Sanity clamp triggers correctly
- [ ] Condition multiplier applies correctly
- [ ] GDPR anonymization function runs

### Monitoring
- [ ] Token usage logging enabled
- [ ] Cost alerts (if >$50/day)
- [ ] Error tracking (Sentry or similar)
- [ ] Uptime monitoring
```

---

## Summary of Changes from v1.0

| Aspect | v1.0 | v2.0 (this spec) |
|--------|------|------------------|
| Terminology | "Valuation" | "Estimate" everywhere |
| Legal | Minimal | Full disclaimer framework, E&O ready |
| Free tier | 1 estimate | 3 estimates |
| Data freshness | Not addressed | Stale detection protocol |
| Confidence | Basic completeness | Multi-factor (completeness + freshness + sanity) |
| B2B | Not addressed | Broker tier, white-label PDF |
| GDPR | Not addressed | Anonymization, retention, minimal PII |
| Database | Basic schema | Indexed, versioned, cost-tracked |
| Testing | 3 cases | 5 cases + terminology enforcement |
| UI copy | "Your valuations" | "Your estimates" |
