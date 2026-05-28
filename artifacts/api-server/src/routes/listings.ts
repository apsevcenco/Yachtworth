import { Router, type IRouter } from "express";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { getSupabase, LISTINGS_TABLE } from "../lib/supabase";
import { isUuid } from "../lib/validators";
import {
  generateListing,
  type ListingSettings,
  type ListingType,
  type ListingStyle,
  type ListingLanguage,
  type ListingWordLength,
  type ListingTone,
  type YachtSnapshot,
} from "../lib/listing/generateListing";

const router: IRouter = Router();

const LISTING_TYPES = new Set<ListingType>(["sale", "charter", "both"]);
const STYLES = new Set<ListingStyle>([
  "professional",
  "luxury",
  "technical",
  "concise",
]);
const LANGUAGES = new Set<ListingLanguage>([
  "english",
  "french",
  "italian",
  "spanish",
  "german",
  "russian",
]);
const WORD_LENGTHS = new Set<ListingWordLength>(["short", "medium", "full"]);
const TONES = new Set<ListingTone>(["neutral", "exclusive", "friendly"]);
const VALID_SECTIONS = new Set([
  "overview",
  "features",
  "accommodation",
  "performance",
  "equipment",
  "charter_info",
  "call_to_action",
]);

interface RawSettings {
  listing_type?: unknown;
  style?: unknown;
  language?: unknown;
  word_length?: unknown;
  tone?: unknown;
  sections?: unknown;
  brokerage_name?: unknown;
  contact_email?: unknown;
}

function parseSettings(raw: unknown): ListingSettings | string {
  if (!raw || typeof raw !== "object") return "settings missing";
  const s = raw as RawSettings;
  if (typeof s.listing_type !== "string" || !LISTING_TYPES.has(s.listing_type as ListingType))
    return "Invalid listing_type";
  if (typeof s.style !== "string" || !STYLES.has(s.style as ListingStyle))
    return "Invalid style";
  if (typeof s.language !== "string" || !LANGUAGES.has(s.language as ListingLanguage))
    return "Invalid language";
  if (
    typeof s.word_length !== "string" ||
    !WORD_LENGTHS.has(s.word_length as ListingWordLength)
  )
    return "Invalid word_length";
  if (typeof s.tone !== "string" || !TONES.has(s.tone as ListingTone))
    return "Invalid tone";
  if (!Array.isArray(s.sections)) return "sections must be an array";
  const sections = s.sections.filter(
    (x): x is string => typeof x === "string" && VALID_SECTIONS.has(x),
  );
  if (sections.length === 0) return "At least one section required";
  return {
    listing_type: s.listing_type as ListingType,
    style: s.style as ListingStyle,
    language: s.language as ListingLanguage,
    word_length: s.word_length as ListingWordLength,
    tone: s.tone as ListingTone,
    sections,
    brokerage_name:
      typeof s.brokerage_name === "string" && s.brokerage_name.trim()
        ? s.brokerage_name.trim().slice(0, 120)
        : null,
    contact_email:
      typeof s.contact_email === "string" && s.contact_email.trim()
        ? s.contact_email.trim().slice(0, 200)
        : null,
  };
}

function parseYacht(raw: unknown): YachtSnapshot | string {
  if (!raw || typeof raw !== "object") return "yacht missing";
  const y = raw as Record<string, unknown>;
  const name = typeof y.name === "string" ? y.name.trim() : "";
  const type = typeof y.type === "string" ? y.type.trim() : "";
  const yearBuilt = Number(y.year_built);
  const lengthM = Number(y.length_meters);
  if (!name) return "yacht.name required";
  if (!type) return "yacht.type required";
  if (!Number.isFinite(yearBuilt) || yearBuilt < 1900 || yearBuilt > 2100)
    return "yacht.year_built invalid";
  if (!Number.isFinite(lengthM) || lengthM <= 0)
    return "yacht.length_meters invalid";
  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const intOrNull = (v: unknown): number | null => {
    const n = num(v);
    return n == null ? null : Math.round(n);
  };
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : null;
  const arr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 120))
      : [];
  return {
    name: name.slice(0, 120),
    type: type.slice(0, 60),
    builder: str(y.builder),
    model: str(y.model),
    year_built: Math.round(yearBuilt),
    length_meters: lengthM,
    beam_meters: num(y.beam_meters),
    guests: intOrNull(y.guests),
    cabins: intOrNull(y.cabins),
    crew: intOrNull(y.crew),
    flag: str(y.flag),
    home_base: str(y.home_base),
    operating_area: str(y.operating_area),
    max_speed_knots: num(y.max_speed_knots),
    cruising_speed_knots: num(y.cruising_speed_knots),
    range_nm: num(y.range_nm),
    engines: str(y.engines),
    highlights: arr(y.highlights),
    equipment_highlights: arr(y.equipment_highlights),
    custom_highlight: str(y.custom_highlight),
    asking_price_eur: num(y.asking_price_eur),
    charter_rate_eur_week: num(y.charter_rate_eur_week),
    photo_url: str(y.photo_url),
  };
}

router.post(
  "/listings/generate",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const yacht = parseYacht(body.yacht);
    if (typeof yacht === "string") {
      res.status(400).json({ error: yacht });
      return;
    }
    const settings = parseSettings(body.settings);
    if (typeof settings === "string") {
      res.status(400).json({ error: settings });
      return;
    }
    const seed =
      typeof body.seed === "number" && Number.isFinite(body.seed)
        ? body.seed
        : null;
    try {
      const result = await generateListing(yacht, settings, seed);
      res.json(result);
    } catch (err) {
      req.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "generateListing unexpected throw",
      );
      res.json({
        generated_text: "",
        ai_used: false,
        model: null,
        warning: "Listing generator failed unexpectedly. Please try again.",
      });
    }
  },
);

const LISTING_LIST_COLUMNS =
  "id,yacht_id,yacht_name,listing_type,style,language,word_length,generated_text,created_at";

router.get(
  "/listings",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.json({ items: [] });
      return;
    }
    const { data, error } = await sb
      .from(LISTINGS_TABLE)
      .select(LISTING_LIST_COLUMNS)
      .eq("clerk_user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      req.log.warn({ err: error.message }, "list listings failed");
      res.json({ items: [] });
      return;
    }
    const items = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      yacht_id: row.yacht_id ?? null,
      yacht_name: row.yacht_name,
      listing_type: row.listing_type,
      style: row.style,
      language: row.language,
      word_length: row.word_length,
      preview:
        typeof row.generated_text === "string"
          ? row.generated_text.replace(/[#*_>`-]/g, "").trim().slice(0, 140)
          : "",
      created_at: row.created_at,
    }));
    res.json({ items });
  },
);

router.post(
  "/listings",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const yachtName =
      typeof body.yacht_name === "string" ? body.yacht_name.trim() : "";
    const generatedText =
      typeof body.generated_text === "string" ? body.generated_text : "";
    if (!yachtName || !generatedText) {
      res.status(400).json({ error: "yacht_name and generated_text required" });
      return;
    }
    if (
      typeof body.listing_type !== "string" ||
      !LISTING_TYPES.has(body.listing_type as ListingType)
    ) {
      res.status(400).json({ error: "Invalid listing_type" });
      return;
    }
    if (
      typeof body.style !== "string" ||
      !STYLES.has(body.style as ListingStyle)
    ) {
      res.status(400).json({ error: "Invalid style" });
      return;
    }
    if (
      typeof body.language !== "string" ||
      !LANGUAGES.has(body.language as ListingLanguage)
    ) {
      res.status(400).json({ error: "Invalid language" });
      return;
    }
    if (
      typeof body.word_length !== "string" ||
      !WORD_LENGTHS.has(body.word_length as ListingWordLength)
    ) {
      res.status(400).json({ error: "Invalid word_length" });
      return;
    }
    let yachtId: string | null =
      typeof body.yacht_id === "string" && isUuid(body.yacht_id)
        ? body.yacht_id
        : null;
    if (yachtId) {
      const { data: ownedYacht } = await sb
        .from("yachts")
        .select("id")
        .eq("id", yachtId)
        .eq("clerk_user_id", req.userId!)
        .maybeSingle();
      if (!ownedYacht) {
        yachtId = null;
      }
    }
    const row = {
      clerk_user_id: req.userId!,
      yacht_id: yachtId,
      yacht_name: yachtName.slice(0, 120),
      listing_type: body.listing_type,
      style: body.style,
      language: body.language,
      word_length: body.word_length,
      generated_text: generatedText.slice(0, 20000),
      yacht_snapshot:
        body.yacht_snapshot && typeof body.yacht_snapshot === "object"
          ? body.yacht_snapshot
          : null,
      settings_snapshot:
        body.settings_snapshot && typeof body.settings_snapshot === "object"
          ? body.settings_snapshot
          : null,
      ai_used: body.ai_used === false ? false : true,
    };
    const { data, error } = await sb
      .from(LISTINGS_TABLE)
      .insert(row)
      .select("*")
      .single();
    if (error || !data) {
      req.log.error({ err: error?.message }, "save listing failed");
      res.status(503).json({ error: "Could not save listing" });
      return;
    }
    res.status(201).json(data);
  },
);

router.get(
  "/listings/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const id = req.params["id"] ?? "";
    if (!isUuid(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { data, error } = await sb
      .from(LISTINGS_TABLE)
      .select("*")
      .eq("id", id)
      .eq("clerk_user_id", req.userId!)
      .maybeSingle();
    if (error || !data) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(data);
  },
);

router.delete(
  "/listings/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const id = req.params["id"] ?? "";
    if (!isUuid(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { error, count } = await sb
      .from(LISTINGS_TABLE)
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("clerk_user_id", req.userId!);
    if (error) {
      req.log.error({ err: error.message }, "delete listing failed");
      res.status(503).json({ error: "Delete failed" });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  },
);

export default router;
