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
    if (contactName) {
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
