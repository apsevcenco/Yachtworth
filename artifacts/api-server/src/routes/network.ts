import { Router, type IRouter } from "express";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import {
  getSupabase,
  NETWORK_CONVERSATIONS_TABLE,
  NETWORK_MESSAGES_TABLE,
  YACHT_NETWORK_LISTINGS_TABLE,
  YACHTS_TABLE,
} from "../lib/supabase";
import { forClerkUser } from "../lib/clerkUserFilter";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const LISTING_TYPES = new Set(["sale", "charter", "both"]);
const VISIBILITIES = new Set(["internal", "broker_network", "private_link"]);
const STATUSES = new Set(["draft", "active", "paused", "archived"]);

const YACHT_SNAPSHOT_COLUMNS =
  "id,name,brand,model,year_built,yacht_type,length_meters,beam_meters,cabins,guests,crew,flag,home_port,marina_location,photo_url,photo_urls,cover_photo_url,commercial_registration,purchase_price_eur,draft_meters,engine_maker,engine_model,engine_count,total_hp,crew_cabins,berths,heads,vat_status";

const NETWORK_COLUMNS =
  "id,clerk_user_id,yacht_id,listing_type,status,visibility,title,description,asking_price_eur,charter_rate_eur_week,currency,location,availability,broker_name,broker_company,contact_email,contact_phone,cover_photo_url,photo_urls,yacht_snapshot,created_at,updated_at,published_at";
const CONVERSATION_COLUMNS =
  "id,listing_id,listing_owner_user_id,starter_user_id,status,last_message_text,last_message_at,created_at,updated_at";
const MESSAGE_COLUMNS =
  "id,conversation_id,sender_user_id,body,read_at,created_at";

function str(value: unknown, max = 400): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 1000))
    : [];
}

function searchPattern(value: string): string {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
}

function compactListing(row: Record<string, unknown>, userId: string) {
  return {
    ...row,
    is_owner: row["clerk_user_id"] === userId,
  };
}

function userIsParticipant(row: Record<string, unknown>, userId: string): boolean {
  return row["listing_owner_user_id"] === userId || row["starter_user_id"] === userId;
}

function otherParticipant(row: Record<string, unknown>, userId: string): string {
  return row["listing_owner_user_id"] === userId
    ? String(row["starter_user_id"] ?? "")
    : String(row["listing_owner_user_id"] ?? "");
}

function compactConversation(
  row: Record<string, unknown>,
  listing: Record<string, unknown> | null | undefined,
  userId: string,
) {
  return {
    ...row,
    listing: listing ? compactListing(listing, userId) : null,
    other_participant_user_id: otherParticipant(row, userId),
    is_listing_owner: row["listing_owner_user_id"] === userId,
  };
}

async function getConversationForUser(id: string, userId: string) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: null };
  const { data, error } = await sb
    .from(NETWORK_CONVERSATIONS_TABLE)
    .select(CONVERSATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { data: null, error };
  const row = data as Record<string, unknown>;
  if (!userIsParticipant(row, userId)) return { data: null, error: null };
  return { data: row, error: null };
}

router.get(
  "/network/listings",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.json({ items: [] });
      return;
    }

    const mine = req.query["mine"] === "1" || req.query["mine"] === "true";
    let query = sb
      .from(YACHT_NETWORK_LISTINGS_TABLE)
      .select(NETWORK_COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (mine) {
      query = forClerkUser(query, req.userId!);
    } else {
      query = query.eq("status", "active").in("visibility", ["internal", "broker_network"]);
    }

    const listingType = str(req.query["listing_type"], 20);
    if (listingType && LISTING_TYPES.has(listingType)) query = query.in("listing_type", [listingType, "both"]);

    const q = str(req.query["q"], 120);
    if (q) {
      const pattern = searchPattern(q);
      if (pattern) query = query.or(`title.ilike.%${pattern}%,description.ilike.%${pattern}%,location.ilike.%${pattern}%`);
    }

    const minLength = num(req.query["min_length_m"]);
    const maxLength = num(req.query["max_length_m"]);
    const maxPrice = num(req.query["max_price_eur"]);
    if (minLength != null) query = query.gte("length_meters", minLength);
    if (maxLength != null) query = query.lte("length_meters", maxLength);
    if (maxPrice != null) query = query.lte("asking_price_eur", maxPrice);

    const { data, error } = await query;
    if (error) {
      req.log.error({ err: error.message }, "network listings failed");
      res.status(503).json({ error: "Could not load Yachtworth Network" });
      return;
    }
    res.json({ items: (data ?? []).map((row) => compactListing(row, req.userId!)) });
  },
);

router.post(
  "/network/listings/publish",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Network storage not configured" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const yachtId = str(body["yacht_id"], 80);
    if (!yachtId || !isUuid(yachtId)) {
      res.status(400).json({ error: "Valid yacht_id required" });
      return;
    }

    const listingType = str(body["listing_type"], 20) ?? "sale";
    if (!LISTING_TYPES.has(listingType)) {
      res.status(400).json({ error: "Invalid listing_type" });
      return;
    }
    const visibility = str(body["visibility"], 30) ?? "internal";
    if (!VISIBILITIES.has(visibility)) {
      res.status(400).json({ error: "Invalid visibility" });
      return;
    }
    const status = str(body["status"], 20) ?? "active";
    if (!STATUSES.has(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const { data: yacht, error: yachtError } = await forClerkUser(
      sb.from(YACHTS_TABLE).select(YACHT_SNAPSHOT_COLUMNS),
      req.userId!,
    )
      .eq("id", yachtId)
      .maybeSingle();
    if (yachtError) {
      req.log.error({ err: yachtError.message }, "network yacht lookup failed");
      res.status(503).json({ error: "Could not load yacht" });
      return;
    }
    if (!yacht) {
      res.status(404).json({ error: "Yacht not found" });
      return;
    }

    const yachtRecord = yacht as Record<string, unknown>;
    const title =
      str(body["title"], 160) ??
      [yachtRecord["brand"], yachtRecord["model"], yachtRecord["name"]]
        .filter(Boolean)
        .join(" ")
        .slice(0, 160);
    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const photos = list(body["photo_urls"]);
    const yachtPhotos = list(yachtRecord["photo_urls"]);
    const cover =
      str(body["cover_photo_url"], 1000) ??
      str(yachtRecord["cover_photo_url"], 1000) ??
      str(yachtRecord["photo_url"], 1000) ??
      yachtPhotos[0] ??
      null;

    const row = {
      clerk_user_id: req.userId!,
      yacht_id: yachtId,
      listing_type: listingType,
      status,
      visibility,
      title,
      description: str(body["description"], 5000),
      asking_price_eur: num(body["asking_price_eur"]),
      charter_rate_eur_week: num(body["charter_rate_eur_week"]),
      currency: str(body["currency"], 12) ?? "EUR",
      location:
        str(body["location"], 180) ??
        str(yachtRecord["marina_location"], 180) ??
        str(yachtRecord["home_port"], 180),
      availability: str(body["availability"], 500),
      broker_name: str(body["broker_name"], 160),
      broker_company: str(body["broker_company"], 160),
      contact_email: str(body["contact_email"], 220),
      contact_phone: str(body["contact_phone"], 80),
      cover_photo_url: cover,
      photo_urls: photos.length ? photos : yachtPhotos,
      yacht_snapshot: yachtRecord,
      length_meters: num(yachtRecord["length_meters"]),
      year_built: num(yachtRecord["year_built"]),
      builder: str(yachtRecord["brand"], 160),
      model: str(yachtRecord["model"], 160),
      cabins: num(yachtRecord["cabins"]),
      guests: num(yachtRecord["guests"]),
      flag: str(yachtRecord["flag"], 120),
      published_at: status === "active" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from(YACHT_NETWORK_LISTINGS_TABLE)
      .insert(row)
      .select(NETWORK_COLUMNS)
      .single();
    if (error || !data) {
      req.log.error({ err: error?.message }, "publish network listing failed");
      res.status(503).json({ error: "Could not publish listing" });
      return;
    }
    res.status(201).json(compactListing(data, req.userId!));
  },
);

router.get(
  "/network/listings/:id",
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
      .from(YACHT_NETWORK_LISTINGS_TABLE)
      .select(NETWORK_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const row = data as Record<string, unknown>;
    const isOwner = row["clerk_user_id"] === req.userId!;
    if (!isOwner && (row["status"] !== "active" || !["internal", "broker_network"].includes(String(row["visibility"])))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(compactListing(row, req.userId!));
  },
);

router.patch(
  "/network/listings/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const id = req.params["id"] ?? "";
    if (!isUuid(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of [
      "title",
      "description",
      "currency",
      "location",
      "availability",
      "broker_name",
      "broker_company",
      "contact_email",
      "contact_phone",
      "cover_photo_url",
    ]) {
      if (key in body) patch[key] = str(body[key], key === "description" ? 5000 : 1000);
    }
    if ("listing_type" in body) {
      const value = str(body["listing_type"], 20);
      if (!value || !LISTING_TYPES.has(value)) {
        res.status(400).json({ error: "Invalid listing_type" });
        return;
      }
      patch["listing_type"] = value;
    }
    if ("visibility" in body) {
      const value = str(body["visibility"], 30);
      if (!value || !VISIBILITIES.has(value)) {
        res.status(400).json({ error: "Invalid visibility" });
        return;
      }
      patch["visibility"] = value;
    }
    if ("status" in body) {
      const value = str(body["status"], 20);
      if (!value || !STATUSES.has(value)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      patch["status"] = value;
      if (value === "active") patch["published_at"] = new Date().toISOString();
    }
    if ("asking_price_eur" in body) patch["asking_price_eur"] = num(body["asking_price_eur"]);
    if ("charter_rate_eur_week" in body) patch["charter_rate_eur_week"] = num(body["charter_rate_eur_week"]);
    if ("photo_urls" in body) patch["photo_urls"] = list(body["photo_urls"]);

    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Network storage not configured" });
      return;
    }
    const { data, error } = await forClerkUser(
      sb.from(YACHT_NETWORK_LISTINGS_TABLE).update(patch),
      req.userId!,
    )
      .eq("id", id)
      .select(NETWORK_COLUMNS)
      .maybeSingle();
    if (error || !data) {
      req.log.error({ err: error?.message }, "update network listing failed");
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(compactListing(data, req.userId!));
  },
);

router.delete(
  "/network/listings/:id",
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
    const { error, count } = await forClerkUser(
      sb
        .from(YACHT_NETWORK_LISTINGS_TABLE)
        .update({ status: "archived", updated_at: new Date().toISOString() }, { count: "exact" }),
      req.userId!,
    ).eq("id", id);
    if (error) {
      req.log.error({ err: error.message }, "archive network listing failed");
      res.status(503).json({ error: "Archive failed" });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  },
);

router.get(
  "/network/conversations",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.json({ items: [] });
      return;
    }

    const { data, error } = await sb
      .from(NETWORK_CONVERSATIONS_TABLE)
      .select(CONVERSATION_COLUMNS)
      .or(`listing_owner_user_id.eq.${req.userId!},starter_user_id.eq.${req.userId!}`)
      .neq("status", "archived")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      req.log.error({ err: error.message }, "network conversations failed");
      res.status(503).json({ error: "Could not load conversations" });
      return;
    }

    const conversations = (data ?? []) as Record<string, unknown>[];
    const listingIds = Array.from(
      new Set(conversations.map((row) => String(row["listing_id"] ?? "")).filter(Boolean)),
    );
    let listingById = new Map<string, Record<string, unknown>>();
    if (listingIds.length) {
      const { data: listings, error: listingsError } = await sb
        .from(YACHT_NETWORK_LISTINGS_TABLE)
        .select(NETWORK_COLUMNS)
        .in("id", listingIds);
      if (listingsError) {
        req.log.warn({ err: listingsError.message }, "network conversation listings failed");
      } else {
        listingById = new Map(
          ((listings ?? []) as Record<string, unknown>[]).map((row) => [String(row["id"]), row]),
        );
      }
    }

    res.json({
      items: conversations.map((row) =>
        compactConversation(row, listingById.get(String(row["listing_id"])), req.userId!),
      ),
    });
  },
);

router.post(
  "/network/listings/:id/conversations",
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
      res.status(503).json({ error: "Network messaging is not configured" });
      return;
    }

    const { data: listing, error: listingError } = await sb
      .from(YACHT_NETWORK_LISTINGS_TABLE)
      .select(NETWORK_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (listingError || !listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const listingRow = listing as Record<string, unknown>;
    const ownerUserId = String(listingRow["clerk_user_id"] ?? "");
    const isOwner = ownerUserId === req.userId!;
    if (!isOwner && (listingRow["status"] !== "active" || !["internal", "broker_network"].includes(String(listingRow["visibility"])))) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (isOwner) {
      res.status(400).json({ error: "This is your listing. Open Messages to view incoming conversations." });
      return;
    }

    const now = new Date().toISOString();
    const row = {
      listing_id: id,
      listing_owner_user_id: ownerUserId,
      starter_user_id: req.userId!,
      status: "active",
      updated_at: now,
    };

    const { data, error } = await sb
      .from(NETWORK_CONVERSATIONS_TABLE)
      .upsert(row, {
        onConflict: "listing_id,listing_owner_user_id,starter_user_id",
      })
      .select(CONVERSATION_COLUMNS)
      .single();
    if (error || !data) {
      req.log.error({ err: error?.message }, "start network conversation failed");
      res.status(503).json({ error: "Could not start conversation" });
      return;
    }

    res.status(201).json(compactConversation(data as Record<string, unknown>, listingRow, req.userId!));
  },
);

router.get(
  "/network/conversations/:id/messages",
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

    const { data: conversation, error: conversationError } = await getConversationForUser(id, req.userId!);
    if (conversationError) {
      req.log.error({ err: conversationError.message }, "network conversation lookup failed");
      res.status(503).json({ error: "Could not load conversation" });
      return;
    }
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const { data: listing } = await sb
      .from(YACHT_NETWORK_LISTINGS_TABLE)
      .select(NETWORK_COLUMNS)
      .eq("id", String(conversation["listing_id"]))
      .maybeSingle();

    const { data, error } = await sb
      .from(NETWORK_MESSAGES_TABLE)
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      req.log.error({ err: error.message }, "network messages failed");
      res.status(503).json({ error: "Could not load messages" });
      return;
    }

    await sb
      .from(NETWORK_MESSAGES_TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .neq("sender_user_id", req.userId!)
      .is("read_at", null);

    res.json({
      conversation: compactConversation(
        conversation,
        listing ? (listing as Record<string, unknown>) : null,
        req.userId!,
      ),
      items: data ?? [],
    });
  },
);

router.post(
  "/network/conversations/:id/messages",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const id = req.params["id"] ?? "";
    if (!isUuid(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const message = str(body["body"], 4000);
    if (!message) {
      res.status(400).json({ error: "Message text required" });
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Network messaging is not configured" });
      return;
    }

    const { data: conversation, error: conversationError } = await getConversationForUser(id, req.userId!);
    if (conversationError) {
      req.log.error({ err: conversationError.message }, "network conversation lookup failed");
      res.status(503).json({ error: "Could not load conversation" });
      return;
    }
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const now = new Date().toISOString();
    const { data, error } = await sb
      .from(NETWORK_MESSAGES_TABLE)
      .insert({
        conversation_id: id,
        sender_user_id: req.userId!,
        body: message,
        created_at: now,
      })
      .select(MESSAGE_COLUMNS)
      .single();

    if (error || !data) {
      req.log.error({ err: error?.message }, "send network message failed");
      res.status(503).json({ error: "Could not send message" });
      return;
    }

    await sb
      .from(NETWORK_CONVERSATIONS_TABLE)
      .update({
        last_message_text: message,
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", id);

    res.status(201).json(data);
  },
);

export default router;
