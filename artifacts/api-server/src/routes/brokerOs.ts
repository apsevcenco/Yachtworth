import { Router, type IRouter } from "express";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import {
  BROKER_ACTIVITY_TABLE,
  BROKER_CASES_TABLE,
  BROKER_CONTACTS_TABLE,
  BROKER_TASKS_TABLE,
  CLIENTS_TABLE,
  getSupabase,
} from "../lib/supabase";
import { forClerkUser } from "../lib/clerkUserFilter";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

const CASE_COLUMNS =
  "id,clerk_user_id,contact_id,company_id,title,case_type,stage,lead_score,status,owner_name,budget_min_eur,budget_max_eur,loa_min_m,loa_max_m,timeline,preferred_regions,mandatory_requirements,preferred_requirements,acceptable_compromises,rejected_characteristics,next_action,next_action_due,last_meaningful_contact_at,risk_level,risk_reason,expected_commission_eur,close_probability,forecast_close_date,notes,created_at,updated_at";

const CONTACT_COLUMNS =
  "id,clerk_user_id,company_id,source_client_id,full_name,email,phone,whatsapp,linkedin,country,citizenship,residency,languages,preferred_channel,relationship_owner,relationship_type,trust_level,source,notes,created_at,updated_at";

type BrokerCaseRow = {
  id: string;
  title: string;
  case_type: string;
  stage: string;
  lead_score: string;
  status: string;
  budget_min_eur: number | null;
  budget_max_eur: number | null;
  loa_min_m: number | null;
  loa_max_m: number | null;
  next_action: string | null;
  next_action_due: string | null;
  last_meaningful_contact_at: string | null;
  risk_level: string;
  risk_reason: string | null;
  expected_commission_eur: number | null;
  close_probability: number;
  forecast_close_date: string | null;
  created_at: string;
  updated_at: string;
};

type BrokerTaskRow = {
  id: string;
  case_id: string | null;
  title: string;
  detail: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_at: string;
};

type BrokerContactRow = {
  id: string;
  company_id?: string | null;
  source_client_id?: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  country: string | null;
  citizenship: string | null;
  residency: string | null;
  languages: string[] | null;
  preferred_channel: string | null;
  relationship_owner: string | null;
  relationship_type: string | null;
  trust_level: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function daysAgo(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 120));
  }
  if (typeof v === "string" && v.trim()) {
    return v
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 30);
  }
  return [];
}

function normalizeCaseType(v: unknown): string {
  const allowed = new Set([
    "buyer_inquiry",
    "seller_mandate",
    "charter_inquiry",
    "charter_central_agency",
    "yacht_management",
    "new_build",
    "refit",
    "valuation",
    "survey",
    "financing",
    "insurance",
    "flag_registration",
    "transport",
    "crew",
    "off_market_introduction",
  ]);
  return typeof v === "string" && allowed.has(v) ? v : "buyer_inquiry";
}

function normalizeLeadScore(v: unknown): "A" | "B" | "C" | "D" {
  return v === "A" || v === "B" || v === "C" || v === "D" ? v : "B";
}

function normalizeRisk(v: unknown): "low" | "medium" | "high" {
  return v === "low" || v === "medium" || v === "high" ? v : "medium";
}

function normalizeStatus(v: unknown): "active" | "paused" | "won" | "lost" | "archived" {
  return v === "active" || v === "paused" || v === "won" || v === "lost" || v === "archived" ? v : "active";
}

function casePayload(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    title: str(body["title"], 200),
    case_type: normalizeCaseType(body["case_type"]),
    stage: str(body["stage"], 80) ?? "new_inquiry",
    lead_score: normalizeLeadScore(body["lead_score"]),
    status: normalizeStatus(body["status"]),
    owner_name: str(body["owner_name"], 160),
    budget_min_eur: toNumber(body["budget_min_eur"]),
    budget_max_eur: toNumber(body["budget_max_eur"]),
    loa_min_m: toNumber(body["loa_min_m"]),
    loa_max_m: toNumber(body["loa_max_m"]),
    timeline: str(body["timeline"], 200),
    preferred_regions: arr(body["preferred_regions"]),
    mandatory_requirements: arr(body["mandatory_requirements"]),
    preferred_requirements: arr(body["preferred_requirements"]),
    acceptable_compromises: arr(body["acceptable_compromises"]),
    rejected_characteristics: arr(body["rejected_characteristics"]),
    next_action: str(body["next_action"], 300),
    next_action_due: str(body["next_action_due"], 20),
    risk_level: normalizeRisk(body["risk_level"]),
    risk_reason: str(body["risk_reason"], 300),
    expected_commission_eur: toNumber(body["expected_commission_eur"]),
    close_probability: Math.max(0, Math.min(100, Math.round(toNumber(body["close_probability"]) ?? 30))),
    forecast_close_date: str(body["forecast_close_date"], 20),
    notes: str(body["notes"], 2000),
    updated_at: new Date().toISOString(),
  };

  if (Object.prototype.hasOwnProperty.call(body, "contact_id")) {
    payload["contact_id"] = isUuid(body["contact_id"]) ? body["contact_id"] : null;
  }

  return payload as {
    title: string | null;
    contact_id?: string | null;
    case_type: string;
    stage: string;
    lead_score: "A" | "B" | "C" | "D";
    status: "active" | "paused" | "won" | "lost" | "archived";
    risk_level: "low" | "medium" | "high";
    close_probability: number;
    updated_at: string;
  } & Record<string, unknown>;
}

function normalizePriority(v: unknown): "low" | "normal" | "high" | "urgent" {
  return v === "low" || v === "normal" || v === "high" || v === "urgent" ? v : "normal";
}

function normalizeChannel(v: unknown): string | null {
  const allowed = new Set(["phone", "email", "whatsapp", "meeting", "note", "other"]);
  return typeof v === "string" && allowed.has(v) ? v : "note";
}

function contactPayload(body: Record<string, unknown>, userId: string) {
  return {
    clerk_user_id: userId,
    full_name: str(body["full_name"], 160) ?? str(body["name"], 160),
    email: str(body["email"], 200),
    phone: str(body["phone"], 80),
    whatsapp: str(body["whatsapp"], 80),
    linkedin: str(body["linkedin"], 240),
    country: str(body["country"], 100),
    citizenship: str(body["citizenship"], 100),
    residency: str(body["residency"], 100),
    languages: arr(body["languages"]),
    preferred_channel: str(body["preferred_channel"], 60),
    relationship_owner: str(body["relationship_owner"], 120),
    relationship_type: str(body["relationship_type"], 80),
    trust_level: str(body["trust_level"], 60),
    source: str(body["source"], 80) ?? "manual",
    notes: str(body["notes"], 2000),
    updated_at: new Date().toISOString(),
  };
}

function computePriority(c: BrokerCaseRow): number {
  let score = 0;
  if (c.lead_score === "A") score += 30;
  if (c.risk_level === "high") score += 25;
  if (c.next_action_due && c.next_action_due <= todayIso()) score += 25;
  const stale = daysAgo(c.last_meaningful_contact_at);
  if (stale != null && stale >= 7) score += 15;
  score += Math.round((c.expected_commission_eur ?? 0) / 100_000);
  score += Math.round((c.close_probability ?? 0) / 10);
  return score;
}

router.get(
  "/broker-os/dashboard",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }

    const [{ data: cases, error: casesErr }, { data: tasks, error: tasksErr }, { data: contacts, error: contactsErr }] =
      await Promise.all([
        forClerkUser(sb.from(BROKER_CASES_TABLE).select(CASE_COLUMNS), req.userId!)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(200),
        forClerkUser(sb.from(BROKER_TASKS_TABLE).select("id,case_id,title,detail,due_date,priority,status,created_at"), req.userId!)
          .eq("status", "open")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(100),
        forClerkUser(sb.from(BROKER_CONTACTS_TABLE).select(CONTACT_COLUMNS), req.userId!)
          .order("updated_at", { ascending: false })
          .limit(50),
      ]);

    if (casesErr || tasksErr || contactsErr) {
      const msg = casesErr?.message ?? tasksErr?.message ?? contactsErr?.message ?? "unknown";
      req.log.error({ err: msg }, "broker dashboard failed");
      res.status(500).json({ error: msg });
      return;
    }

    const caseRows = (cases ?? []) as BrokerCaseRow[];
    const taskRows = (tasks ?? []) as BrokerTaskRow[];
    const today = todayIso();
    const overdueTasks = taskRows.filter((t) => t.due_date && t.due_date < today);
    const dueTodayTasks = taskRows.filter((t) => t.due_date === today);
    const staleCases = caseRows.filter((c) => {
      const d = daysAgo(c.last_meaningful_contact_at);
      return d != null && d >= 7;
    });
    const priorityCases = caseRows
      .map((c) => ({ ...c, priority_score: computePriority(c), days_since_contact: daysAgo(c.last_meaningful_contact_at) }))
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 10);
    const forecast = caseRows.reduce(
      (acc, c) => {
        const expected = Number(c.expected_commission_eur ?? 0);
        const weighted = expected * ((c.close_probability ?? 0) / 100);
        acc.expected_commission_eur += expected;
        acc.weighted_commission_eur += weighted;
        return acc;
      },
      { expected_commission_eur: 0, weighted_commission_eur: 0 },
    );

    res.json({
      today: {
        overdue_followups: overdueTasks.length,
        due_today: dueTodayTasks.length,
        stale_cases: staleCases.length,
        active_cases: caseRows.length,
        contacts: contacts?.length ?? 0,
      },
      priority_cases: priorityCases,
      tasks: [...overdueTasks, ...dueTodayTasks].slice(0, 20),
      forecast: {
        expected_commission_eur: Math.round(forecast.expected_commission_eur),
        weighted_commission_eur: Math.round(forecast.weighted_commission_eur),
      },
      recent_contacts: contacts ?? [],
    });
  },
);

router.get(
  "/broker-os/cases",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const { data, error } = await forClerkUser(sb.from(BROKER_CASES_TABLE).select(CASE_COLUMNS), req.userId!)
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.get(
  "/broker-os/pipeline",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const { data, error } = await forClerkUser(sb.from(BROKER_CASES_TABLE).select(CASE_COLUMNS), req.userId!)
      .in("status", ["active", "paused"])
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ items: data ?? [] });
  },
);

router.get(
  "/broker-os/contacts",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }

    const source = str(req.query["source"], 80);
    const q = str(req.query["q"], 160)?.toLowerCase();

    let contactsQuery = forClerkUser(sb.from(BROKER_CONTACTS_TABLE).select(CONTACT_COLUMNS), req.userId!)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (source && source !== "all") contactsQuery = contactsQuery.eq("source", source);

    const [
      { data: contacts, error: contactsErr },
      { data: allContacts, error: allContactsErr },
      { data: cases, error: casesErr },
    ] = await Promise.all([
      contactsQuery,
      forClerkUser(sb.from(BROKER_CONTACTS_TABLE).select(CONTACT_COLUMNS), req.userId!)
        .order("updated_at", { ascending: false })
        .limit(500),
      forClerkUser(
        sb.from(BROKER_CASES_TABLE).select("id,contact_id,title,case_type,stage,status,updated_at"),
        req.userId!,
      ).limit(1000),
    ]);

    if (contactsErr || allContactsErr || casesErr) {
      const msg = contactsErr?.message ?? allContactsErr?.message ?? casesErr?.message ?? "unknown";
      req.log.error({ err: msg }, "broker crm contacts failed");
      res.status(500).json({ error: msg });
      return;
    }

    const caseRows = (cases ?? []) as Array<{
      id: string;
      contact_id: string | null;
      title: string;
      case_type: string;
      stage: string;
      status: string;
      updated_at: string;
    }>;
    const casesByContact = new Map<string, typeof caseRows>();
    for (const c of caseRows) {
      if (!c.contact_id) continue;
      casesByContact.set(c.contact_id, [...(casesByContact.get(c.contact_id) ?? []), c]);
    }

    const rows = ((contacts ?? []) as BrokerContactRow[]).filter((c) => {
      if (!q) return true;
      const haystack = [
        c.full_name,
        c.email,
        c.phone,
        c.whatsapp,
        c.country,
        c.citizenship,
        c.residency,
        c.relationship_type,
        c.source,
        c.notes,
        ...(c.languages ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    const enriched = rows.map((contact) => {
      const linkedCases = casesByContact.get(contact.id) ?? [];
      const activeCases = linkedCases.filter((c) => c.status === "active");
      return {
        ...contact,
        cases_count: linkedCases.length,
        active_cases_count: activeCases.length,
        last_case_title: linkedCases[0]?.title ?? null,
        cases: linkedCases.slice(0, 8),
      };
    });

    const filterContacts = (allContacts ?? []) as BrokerContactRow[];
    res.json({
      items: enriched,
      total: enriched.length,
      filters: {
        sources: Array.from(new Set(filterContacts.map((c) => c.source).filter((v): v is string => Boolean(v)))).sort(),
        relationship_types: Array.from(
          new Set(filterContacts.map((c) => c.relationship_type).filter((v): v is string => Boolean(v))),
        ).sort(),
      },
    });
  },
);

router.post(
  "/broker-os/contacts",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker CRM storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const payload = contactPayload(body, req.userId!);
    if (!payload.full_name) {
      res.status(400).json({ error: "full_name required" });
      return;
    }

    const { data, error } = await sb.from(BROKER_CONTACTS_TABLE).insert(payload).select(CONTACT_COLUMNS).single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    await sb.from(BROKER_ACTIVITY_TABLE).insert({
      clerk_user_id: req.userId!,
      contact_id: data.id,
      activity_type: "contact_created",
      channel: "note",
      subject: "Contact created",
      body: payload.notes,
    });

    res.status(201).json({ item: data });
  },
);

router.get(
  "/broker-os/contacts/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker CRM storage not configured" });
      return;
    }

    const { data: contact, error: contactErr } = await forClerkUser(
      sb.from(BROKER_CONTACTS_TABLE).select(CONTACT_COLUMNS),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (contactErr) {
      res.status(500).json({ error: contactErr.message });
      return;
    }
    if (!contact) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [{ data: cases }, { data: tasks }, { data: activity }] = await Promise.all([
      forClerkUser(
        sb.from(BROKER_CASES_TABLE).select("id,contact_id,title,case_type,stage,status,updated_at"),
        req.userId!,
      )
        .eq("contact_id", contact.id)
        .order("updated_at", { ascending: false })
        .limit(100),
      forClerkUser(sb.from(BROKER_TASKS_TABLE).select("*"), req.userId!)
        .eq("contact_id", contact.id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(100),
      forClerkUser(sb.from(BROKER_ACTIVITY_TABLE).select("*"), req.userId!)
        .eq("contact_id", contact.id)
        .order("happened_at", { ascending: false })
        .limit(100),
    ]);

    res.json({ item: contact, cases: cases ?? [], tasks: tasks ?? [], activity: activity ?? [] });
  },
);

router.patch(
  "/broker-os/contacts/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker CRM storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const payload = contactPayload(body, req.userId!);
    if (!payload.full_name) {
      res.status(400).json({ error: "full_name required" });
      return;
    }
    const { data, error } = await forClerkUser(
      sb.from(BROKER_CONTACTS_TABLE).update(payload).select(CONTACT_COLUMNS),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await sb.from(BROKER_ACTIVITY_TABLE).insert({
      clerk_user_id: req.userId!,
      contact_id: data.id,
      activity_type: "contact_updated",
      channel: "note",
      subject: "Contact updated",
    });

    res.json({ item: data });
  },
);

router.delete(
  "/broker-os/contacts/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker CRM storage not configured" });
      return;
    }
    const { error, count } = await forClerkUser(
      sb.from(BROKER_CONTACTS_TABLE).delete({ count: "exact" }),
      req.userId!,
    ).eq("id", req.params["id"]);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  },
);

router.post(
  "/broker-os/contacts/:id/tasks",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker CRM storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = str(body["title"], 220);
    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }
    const { data: contact } = await forClerkUser(
      sb.from(BROKER_CONTACTS_TABLE).select("id"),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (!contact) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { data, error } = await sb
      .from(BROKER_TASKS_TABLE)
      .insert({
        clerk_user_id: req.userId!,
        contact_id: contact.id,
        title,
        detail: str(body["detail"], 1000),
        due_date: str(body["due_date"], 20),
        priority: normalizePriority(body["priority"]),
      })
      .select("*")
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    await sb.from(BROKER_ACTIVITY_TABLE).insert({
      clerk_user_id: req.userId!,
      contact_id: contact.id,
      activity_type: "task_created",
      channel: "note",
      subject: title,
      body: str(body["detail"], 1000),
    });
    res.status(201).json({ item: data });
  },
);

router.post(
  "/broker-os/contacts/:id/activity",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker CRM storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const subject = str(body["subject"], 220) ?? "CRM note";
    const bodyText = str(body["body"], 2000);
    if (!bodyText && !subject) {
      res.status(400).json({ error: "activity body required" });
      return;
    }
    const { data: contact } = await forClerkUser(
      sb.from(BROKER_CONTACTS_TABLE).select("id"),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (!contact) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { data, error } = await sb
      .from(BROKER_ACTIVITY_TABLE)
      .insert({
        clerk_user_id: req.userId!,
        contact_id: contact.id,
        activity_type: str(body["activity_type"], 80) ?? "note",
        channel: normalizeChannel(body["channel"]),
        subject,
        body: bodyText,
      })
      .select("*")
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ item: data });
  },
);

router.post(
  "/broker-os/cases",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const contactName = str(body["contact_name"], 160);
    const title = str(body["title"], 200);
    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    let contactId: string | null = null;
    if (isUuid(body["contact_id"])) {
      const { data: existingContact, error: existingContactErr } = await forClerkUser(
        sb.from(BROKER_CONTACTS_TABLE).select("id"),
        req.userId!,
      )
        .eq("id", body["contact_id"])
        .maybeSingle();
      if (existingContactErr) {
        res.status(500).json({ error: existingContactErr.message });
        return;
      }
      if (!existingContact) {
        res.status(404).json({ error: "contact not found" });
        return;
      }
      contactId = existingContact.id;
    } else if (contactName) {
      const { data: contact, error: contactErr } = await sb
        .from(BROKER_CONTACTS_TABLE)
        .insert({
          clerk_user_id: req.userId!,
          full_name: contactName,
          email: str(body["contact_email"], 200),
          phone: str(body["contact_phone"], 80),
          preferred_channel: str(body["preferred_channel"], 60),
          source: "manual",
        })
        .select("id")
        .single();
      if (contactErr) {
        res.status(500).json({ error: contactErr.message });
        return;
      }
      contactId = contact?.id ?? null;
    }

    const insert = {
      clerk_user_id: req.userId!,
      contact_id: contactId,
      title,
      case_type: normalizeCaseType(body["case_type"]),
      stage: str(body["stage"], 80) ?? "new_inquiry",
      lead_score: normalizeLeadScore(body["lead_score"]),
      owner_name: str(body["owner_name"], 160),
      budget_min_eur: toNumber(body["budget_min_eur"]),
      budget_max_eur: toNumber(body["budget_max_eur"]),
      loa_min_m: toNumber(body["loa_min_m"]),
      loa_max_m: toNumber(body["loa_max_m"]),
      timeline: str(body["timeline"], 200),
      preferred_regions: arr(body["preferred_regions"]),
      mandatory_requirements: arr(body["mandatory_requirements"]),
      preferred_requirements: arr(body["preferred_requirements"]),
      next_action: str(body["next_action"], 300),
      next_action_due: str(body["next_action_due"], 20),
      risk_level: normalizeRisk(body["risk_level"]),
      risk_reason: str(body["risk_reason"], 300),
      expected_commission_eur: toNumber(body["expected_commission_eur"]),
      close_probability: Math.max(0, Math.min(100, Math.round(toNumber(body["close_probability"]) ?? 30))),
      forecast_close_date: str(body["forecast_close_date"], 20),
      notes: str(body["notes"], 1000),
    };

    const { data: created, error } = await sb
      .from(BROKER_CASES_TABLE)
      .insert(insert)
      .select(CASE_COLUMNS)
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (insert.next_action) {
      await sb.from(BROKER_TASKS_TABLE).insert({
        clerk_user_id: req.userId!,
        case_id: created.id,
        contact_id: contactId,
        title: insert.next_action,
        due_date: insert.next_action_due,
        priority: insert.risk_level === "high" ? "high" : "normal",
      });
    }

    await sb.from(BROKER_ACTIVITY_TABLE).insert({
      clerk_user_id: req.userId!,
      case_id: created.id,
      contact_id: contactId,
      activity_type: "case_created",
      channel: "manual",
      subject: title,
      body: insert.notes,
    });

    res.status(201).json({ item: created });
  },
);

router.patch(
  "/broker-os/cases/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const payload = casePayload(body);
    if (!payload.title) {
      res.status(400).json({ error: "title required" });
      return;
    }
    const { data, error } = await forClerkUser(
      sb.from(BROKER_CASES_TABLE).update(payload).select(CASE_COLUMNS),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await sb.from(BROKER_ACTIVITY_TABLE).insert({
      clerk_user_id: req.userId!,
      case_id: data.id,
      contact_id: data.contact_id,
      activity_type: "case_updated",
      channel: "note",
      subject: "Case updated",
    });
    res.json({ item: data });
  },
);

router.post(
  "/broker-os/cases/:id/tasks",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = str(body["title"], 220);
    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }
    const { data: brokerCase } = await forClerkUser(
      sb.from(BROKER_CASES_TABLE).select("id,contact_id"),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (!brokerCase) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { data, error } = await sb
      .from(BROKER_TASKS_TABLE)
      .insert({
        clerk_user_id: req.userId!,
        case_id: brokerCase.id,
        contact_id: brokerCase.contact_id,
        title,
        detail: str(body["detail"], 1000),
        due_date: str(body["due_date"], 20),
        priority: normalizePriority(body["priority"]),
      })
      .select("*")
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    await sb.from(BROKER_ACTIVITY_TABLE).insert({
      clerk_user_id: req.userId!,
      case_id: brokerCase.id,
      contact_id: brokerCase.contact_id,
      activity_type: "task_created",
      channel: "note",
      subject: title,
      body: str(body["detail"], 1000),
    });
    res.status(201).json({ item: data });
  },
);

router.patch(
  "/broker-os/tasks/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const status = body["status"] === "done" || body["status"] === "cancelled" || body["status"] === "open" ? body["status"] : "done";
    const { data, error } = await forClerkUser(
      sb.from(BROKER_TASKS_TABLE).update({ status, updated_at: new Date().toISOString() }).select("*"),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await sb.from(BROKER_ACTIVITY_TABLE).insert({
      clerk_user_id: req.userId!,
      case_id: data.case_id,
      contact_id: data.contact_id,
      activity_type: "task_updated",
      channel: "note",
      subject: `${data.title} marked ${status}`,
    });
    res.json({ item: data });
  },
);

router.post(
  "/broker-os/cases/:id/activity",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const subject = str(body["subject"], 220) ?? "Case note";
    const bodyText = str(body["body"], 2000);
    const { data: brokerCase } = await forClerkUser(
      sb.from(BROKER_CASES_TABLE).select("id,contact_id"),
      req.userId!,
    )
      .eq("id", req.params["id"])
      .maybeSingle();
    if (!brokerCase) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { data, error } = await sb
      .from(BROKER_ACTIVITY_TABLE)
      .insert({
        clerk_user_id: req.userId!,
        case_id: brokerCase.id,
        contact_id: brokerCase.contact_id,
        activity_type: str(body["activity_type"], 80) ?? "note",
        channel: normalizeChannel(body["channel"]),
        subject,
        body: bodyText,
      })
      .select("*")
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ item: data });
  },
);

router.get(
  "/broker-os/import-charter-clients",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const { data: clients, error } = await forClerkUser(
      sb.from(CLIENTS_TABLE).select("id,name,email,phone,notes"),
      req.userId!,
    ).limit(500);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    let imported = 0;
    for (const c of clients ?? []) {
      const { error: upsertErr } = await sb.from(BROKER_CONTACTS_TABLE).upsert(
        {
          clerk_user_id: req.userId!,
          source_client_id: c.id,
          full_name: c.name,
          email: c.email,
          phone: c.phone,
          notes: c.notes,
          source: "charter_planner",
        },
        { onConflict: "clerk_user_id,source_client_id" },
      );
      if (!upsertErr) imported += 1;
    }
    res.json({ imported });
  },
);

router.get(
  "/broker-os/cases/:id",
  softClerkAuth(),
  requireAuth(),
  async (req, res): Promise<void> => {
    if (!isUuid(req.params["id"])) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      res.status(503).json({ error: "Broker OS storage not configured" });
      return;
    }
    const { data: item, error } = await forClerkUser(sb.from(BROKER_CASES_TABLE).select(CASE_COLUMNS), req.userId!)
      .eq("id", req.params["id"])
      .maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [{ data: tasks }, { data: activity }] = await Promise.all([
      forClerkUser(sb.from(BROKER_TASKS_TABLE).select("*"), req.userId!).eq("case_id", item.id).order("created_at", { ascending: false }).limit(100),
      forClerkUser(sb.from(BROKER_ACTIVITY_TABLE).select("*"), req.userId!).eq("case_id", item.id).order("happened_at", { ascending: false }).limit(100),
    ]);
    res.json({ item, tasks: tasks ?? [], activity: activity ?? [] });
  },
);

export default router;
