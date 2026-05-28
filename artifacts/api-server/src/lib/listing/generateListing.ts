import { anthropicMessage, isAnthropicConfigured } from "./anthropic";

export type ListingType = "sale" | "charter" | "both";
export type ListingStyle = "professional" | "luxury" | "technical" | "concise";
export type ListingLanguage =
  | "english"
  | "french"
  | "italian"
  | "spanish"
  | "german"
  | "russian";
export type ListingWordLength = "short" | "medium" | "full";
export type ListingTone = "neutral" | "exclusive" | "friendly";

export interface YachtSnapshot {
  name: string;
  type: string;
  builder?: string | null;
  model?: string | null;
  year_built: number;
  length_meters: number;
  beam_meters?: number | null;
  guests?: number | null;
  cabins?: number | null;
  crew?: number | null;
  flag?: string | null;
  home_base?: string | null;
  operating_area?: string | null;
  max_speed_knots?: number | null;
  cruising_speed_knots?: number | null;
  range_nm?: number | null;
  engines?: string | null;
  highlights?: string[];
  equipment_highlights?: string[];
  custom_highlight?: string | null;
  asking_price_eur?: number | null;
  charter_rate_eur_week?: number | null;
  photo_url?: string | null;
}

export interface ListingSettings {
  listing_type: ListingType;
  style: ListingStyle;
  language: ListingLanguage;
  word_length: ListingWordLength;
  tone: ListingTone;
  sections: string[];
  brokerage_name?: string | null;
  contact_email?: string | null;
}

export interface GenerateListingResult {
  generated_text: string;
  ai_used: boolean;
  model: string | null;
  warning: string | null;
}

const WORD_TARGETS: Record<ListingWordLength, number> = {
  short: 150,
  medium: 300,
  full: 500,
};

const STYLE_LABELS: Record<ListingStyle, string> = {
  professional: "professional and formal",
  luxury: "luxury and aspirational",
  technical: "technical and detailed",
  concise: "concise and summary-focused",
};

const LANGUAGE_LABELS: Record<ListingLanguage, string> = {
  english: "English (British spelling)",
  french: "French",
  italian: "Italian",
  spanish: "Spanish",
  german: "German",
  russian: "Russian",
};

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview / introduction",
  features: "Key features & highlights",
  accommodation: "Accommodation & interior",
  performance: "Performance & technical",
  equipment: "Equipment & systems",
  charter_info: "Charter / price information",
  call_to_action: "Call to action (contact broker)",
};

export const LISTING_SYSTEM_PROMPT = `You are a senior yacht broker and marketing copywriter with 20+ years experience writing yacht sales and charter listings for top international brokerages.

You write compelling, accurate, professional yacht listing copy that attracts serious buyers and charter guests.

YOUR WRITING PRINCIPLES:
- Lead with the yacht's strongest selling point
- Use specific details (exact measurements, engine specs, refit year) — never vague
- Avoid clichés: never use "turn-key", "must see", "motivated seller", "priced to sell"
- Avoid hollow adjectives alone: instead of "stunning interior" say what makes it stunning
- Match the register to the market: superyachts = formal and aspirational; sailing yachts = adventurous; sport cruisers = energetic
- Be precise about what is included and what is not
- Never invent specifications not provided — if unknown, omit gracefully
- For charter listings: focus on the guest experience, not the technical specs
- For sale listings: focus on ownership experience, investment and condition

STRUCTURE depending on sections requested:
- Overview: 2-3 sentences that capture the essence of the yacht
- Key features: bullet points of 4-8 most compelling attributes
- Accommodation: cabins, layout, finishes
- Performance: speed, range, engines — only if data provided
- Equipment: notable systems, toys, technology
- Charter info: rate, area, season (if charter listing)
- Call to action: contact broker (if brokerage name provided)

LANGUAGE RULES:
- English: British English spelling (colour, harbour, recognise)
- French: formal register, "voilier" not "bateau à voile", avoid anglicisms
- Italian: formal nautical terminology
- Russian: formal business Russian, avoid calques from English

OUTPUT FORMAT:
Return ONLY the listing text, no JSON wrapper.
Use markdown: ## for section headers, **bold** for yacht name and key specs, regular text for body.
Do not include any preamble, explanation or meta-commentary.
Start directly with the listing headline or first line of the overview.`;

export function buildListingUserPrompt(
  yacht: YachtSnapshot,
  settings: ListingSettings,
  seed?: number | null,
): string {
  const sectionLabels = settings.sections
    .map((s) => SECTION_LABELS[s] ?? s)
    .join(", ");
  const highlights = (yacht.highlights ?? []).join(", ");
  const equipment = (yacht.equipment_highlights ?? []).join(", ");
  const wordTarget = WORD_TARGETS[settings.word_length];
  const listingTypeLabel =
    settings.listing_type === "both"
      ? "For Sale AND For Charter"
      : settings.listing_type === "sale"
        ? "For Sale"
        : "For Charter";
  const beam =
    yacht.beam_meters != null && yacht.beam_meters > 0
      ? ` · Beam: ${yacht.beam_meters}m`
      : "";
  const lines: string[] = [];
  lines.push(
    `Write a ${STYLE_LABELS[settings.style]} yacht listing in ${LANGUAGE_LABELS[settings.language]}.`,
  );
  lines.push(`Type: ${listingTypeLabel}`);
  lines.push(`Length: approximately ${wordTarget} words`);
  lines.push(`Tone: ${settings.tone}`);
  lines.push(`Sections to include: ${sectionLabels}`);
  lines.push("");
  lines.push("YACHT DETAILS:");
  lines.push(`Name: ${yacht.name}`);
  lines.push(`Type: ${humanizeType(yacht.type)}`);
  if (yacht.builder) lines.push(`Builder: ${yacht.builder}`);
  if (yacht.model) lines.push(`Model: ${yacht.model}`);
  lines.push(`Year built: ${yacht.year_built}`);
  lines.push(`LOA: ${yacht.length_meters}m${beam}`);
  if (yacht.guests != null) lines.push(`Guests: ${yacht.guests}`);
  if (yacht.cabins != null) lines.push(`Cabins: ${yacht.cabins}`);
  if (yacht.crew != null) lines.push(`Crew: ${yacht.crew}`);
  if (yacht.flag) lines.push(`Flag: ${yacht.flag}`);
  if (yacht.home_base) lines.push(`Home base: ${yacht.home_base}`);
  if (yacht.operating_area)
    lines.push(`Operating area: ${yacht.operating_area}`);
  if (yacht.max_speed_knots != null)
    lines.push(`Max speed: ${yacht.max_speed_knots} knots`);
  if (yacht.cruising_speed_knots != null)
    lines.push(`Cruising speed: ${yacht.cruising_speed_knots} knots`);
  if (yacht.range_nm != null) lines.push(`Range: ${yacht.range_nm} nm`);
  if (yacht.engines) lines.push(`Engines: ${yacht.engines}`);
  lines.push("");
  lines.push("KEY HIGHLIGHTS:");
  lines.push(highlights || "Not specified");
  lines.push("");
  lines.push("NOTABLE EQUIPMENT:");
  lines.push(equipment || "Not specified");
  if (yacht.custom_highlight) {
    lines.push("");
    lines.push(`ADDITIONAL INFO: ${yacht.custom_highlight}`);
  }
  if (settings.listing_type !== "charter" && yacht.asking_price_eur != null) {
    lines.push("");
    lines.push(`ASKING PRICE: €${formatEuro(yacht.asking_price_eur)}`);
  }
  if (
    settings.listing_type !== "sale" &&
    yacht.charter_rate_eur_week != null
  ) {
    lines.push("");
    lines.push(
      `CHARTER RATE: €${formatEuro(yacht.charter_rate_eur_week)} per week`,
    );
  }
  if (settings.brokerage_name) {
    lines.push("");
    lines.push(`BROKERAGE: ${settings.brokerage_name}`);
  }
  if (settings.contact_email) {
    lines.push(`CONTACT: ${settings.contact_email}`);
  }
  if (typeof seed === "number" && Number.isFinite(seed)) {
    lines.push("");
    lines.push(
      `VARIATION HINT: produce a fresh phrasing different from previous attempts (variation ${seed}).`,
    );
  }
  lines.push("");
  lines.push("Write the listing now. Start directly with the content.");
  return lines.join("\n");
}

function humanizeType(t: string): string {
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEuro(n: number): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

export async function generateListing(
  yacht: YachtSnapshot,
  settings: ListingSettings,
  seed?: number | null,
): Promise<GenerateListingResult> {
  if (!isAnthropicConfigured()) {
    return {
      generated_text: deterministicFallback(yacht, settings),
      ai_used: false,
      model: null,
      warning: "AI not configured — used deterministic template.",
    };
  }
  try {
    const text = await anthropicMessage({
      model: "claude-sonnet-4-6",
      maxTokens: 1200,
      system: LISTING_SYSTEM_PROMPT,
      userContent: buildListingUserPrompt(yacht, settings, seed),
    });
    if (!text || text.length < 40) {
      return {
        generated_text: deterministicFallback(yacht, settings),
        ai_used: false,
        model: null,
        warning: "AI returned empty — used deterministic template.",
      };
    }
    return {
      generated_text: text,
      ai_used: true,
      model: "claude-sonnet-4-6",
      warning: null,
    };
  } catch {
    return {
      generated_text: deterministicFallback(yacht, settings),
      ai_used: false,
      model: null,
      warning: "AI lookup failed — used deterministic template.",
    };
  }
}

export function deterministicFallback(
  yacht: YachtSnapshot,
  settings: ListingSettings,
): string {
  const parts: string[] = [];
  const headline = `**${yacht.name.toUpperCase()}**${yacht.builder ? ` · ${yacht.builder}` : ""}${yacht.model ? ` ${yacht.model}` : ""} · ${yacht.year_built}`;
  parts.push(headline);
  parts.push("");
  parts.push(
    `${humanizeType(yacht.type)} of ${yacht.length_meters}m LOA, built in ${yacht.year_built}${yacht.builder ? ` by ${yacht.builder}` : ""}.`,
  );
  if (yacht.guests != null || yacht.cabins != null) {
    parts.push(
      `Accommodates ${yacht.guests ?? "—"} guests in ${yacht.cabins ?? "—"} cabins${yacht.crew != null ? `, served by ${yacht.crew} crew` : ""}.`,
    );
  }
  if (yacht.home_base) parts.push(`Currently based in ${yacht.home_base}.`);
  const hi = (yacht.highlights ?? []).concat(yacht.equipment_highlights ?? []);
  if (hi.length) {
    parts.push("");
    parts.push("## Key features");
    for (const h of hi.slice(0, 10)) parts.push(`- ${h}`);
  }
  if (
    settings.listing_type !== "charter" &&
    yacht.asking_price_eur != null
  ) {
    parts.push("");
    parts.push(`**Asking price:** €${formatEuro(yacht.asking_price_eur)}`);
  }
  if (
    settings.listing_type !== "sale" &&
    yacht.charter_rate_eur_week != null
  ) {
    parts.push(
      `**Charter rate:** €${formatEuro(yacht.charter_rate_eur_week)} / week`,
    );
  }
  if (settings.brokerage_name || settings.contact_email) {
    parts.push("");
    parts.push(
      `Contact ${settings.brokerage_name ?? "the listing broker"}${settings.contact_email ? ` — ${settings.contact_email}` : ""}.`,
    );
  }
  return parts.join("\n");
}
