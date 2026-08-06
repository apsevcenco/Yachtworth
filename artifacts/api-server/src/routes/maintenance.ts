import { Router, type IRouter, type Request, type RequestHandler, type Response } from "express";
import multer from "multer";
import {
  COUNTER_READINGS_TABLE,
  DEFECTS_TABLE,
  EQUIPMENT_ASSETS_TABLE,
  EQUIPMENT_COUNTERS_TABLE,
  EQUIPMENT_LOCATIONS_TABLE,
  INVENTORY_MOVEMENTS_TABLE,
  MAINTENANCE_AUDIT_EVENTS_TABLE,
  MAINTENANCE_DOCUMENTS_TABLE,
  MAINTENANCE_INTERVALS_TABLE,
  MAINTENANCE_PLANS_TABLE,
  MAINTENANCE_SYSTEM_TEMPLATES_TABLE,
  MAINTENANCE_SYSTEMS_TABLE,
  MAINTENANCE_TASKS_TABLE,
  MAINTENANCE_VENDORS_TABLE,
  SERVICE_EVENT_CORRECTIONS_TABLE,
  SERVICE_EVENTS_TABLE,
  SPARE_PARTS_TABLE,
  WORK_ORDER_ASSETS_TABLE,
  WORK_ORDERS_TABLE,
  YACHTS_TABLE,
  getSupabase,
} from "../lib/supabase";
import { forClerkUser } from "../lib/clerkUserFilter";
import { requireAuth, softClerkAuth } from "../middlewares/clerkAuth";
import { isUuid } from "../lib/validators";

const router: IRouter = Router();

router.use("/maintenance", softClerkAuth(), requireAuth());

const ATTACHMENT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const MAINTENANCE_ATTACHMENTS_BUCKET = process.env.MAINTENANCE_ATTACHMENTS_BUCKET || "maintenance-attachments";

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATTACHMENT_UPLOAD_MAX_BYTES, files: 1 },
});

const attachmentUploadMw: RequestHandler = (req, res, next) => {
  attachmentUpload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: `File too large. Max ${ATTACHMENT_UPLOAD_MAX_BYTES / 1024 / 1024} MB.`,
        });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  });
};

function body(req: { body?: unknown }): Record<string, unknown> {
  return typeof req.body === "object" && req.body != null ? (req.body as Record<string, unknown>) : {};
}

function s(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function n(v: unknown): number | null {
  if (v == null || v === "") return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function b(v: unknown): boolean {
  return v === true;
}

function uuid(v: unknown): string | null {
  const value = s(v);
  return value && isUuid(value) ? value : null;
}

function jsonArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function fileExtension(originalName?: string, mimeType?: string): string {
  const fromName = originalName?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 8) return fromName;
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType?.startsWith("image/")) return "jpg";
  return "bin";
}

function storageFileName(originalName?: string): string {
  const base = originalName?.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "attachment";
  return base || "attachment";
}

async function ensureMaintenanceAttachmentsBucket(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const existing = await sb.storage.getBucket(MAINTENANCE_ATTACHMENTS_BUCKET);
  if (!existing.error) return;
  await sb.storage.createBucket(MAINTENANCE_ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: ATTACHMENT_UPLOAD_MAX_BYTES,
  });
}

async function assertYacht(req: Request, res: Response, yachtId: string): Promise<boolean> {
  if (!isUuid(yachtId)) {
    res.status(404).json({ error: "Yacht not found" });
    return false;
  }
  const sb = getSupabase();
  if (!sb) {
    res.status(503).json({ error: "Maintenance storage not configured" });
    return false;
  }
  const { data, error } = await forClerkUser(sb.from(YACHTS_TABLE).select("id"), req.userId!).eq("id", yachtId).maybeSingle();
  if (error) {
    req.log.error({ err: error.message }, "Maintenance yacht ownership check failed");
    res.status(500).json({ error: error.message });
    return false;
  }
  if (!data) {
    res.status(404).json({ error: "Yacht not found" });
    return false;
  }
  return true;
}

async function assetBelongsToYacht(assetId: string | null, yachtId: string): Promise<boolean> {
  if (!assetId || !isUuid(assetId)) return false;
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb.from(EQUIPMENT_ASSETS_TABLE).select("id").eq("id", assetId).eq("yacht_id", yachtId).maybeSingle();
  return Boolean(data);
}

async function audit(
  yachtId: string,
  actor: string | null | undefined,
  eventType: string,
  entityType: string,
  entityId: string | null,
  next: unknown,
) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(MAINTENANCE_AUDIT_EVENTS_TABLE).insert({
    yacht_id: yachtId,
    actor_user_id: actor ?? null,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    new_value: next,
  });
}

function statusForTask(task: Record<string, unknown>): string {
  const current = s(task["status"]);
  if (current && !["upcoming", "due", "overdue"].includes(current)) return current;
  const dueAt = s(task["due_at"]);
  const dueCounter = n(task["due_counter_value"]);
  const currentCounter = n(task["current_counter_value"]);
  if (dueCounter != null && currentCounter != null && currentCounter >= dueCounter) return "overdue";
  if (!dueAt) return "upcoming";
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(due)) return "upcoming";
  if (due < now) return "overdue";
  if (due - now <= 7 * 24 * 60 * 60 * 1000) return "due";
  return "upcoming";
}

router.get("/maintenance/system-templates", async (_req, res) => {
  const sb = getSupabase();
  if (!sb) {
    res.status(503).json({ error: "Maintenance storage not configured" });
    return;
  }
  const { data, error } = await sb.from(MAINTENANCE_SYSTEM_TEMPLATES_TABLE).select("*").eq("is_active", true).order("sort_order");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.get("/maintenance/yachts/:yachtId/dashboard", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const [systems, assets, tasks, defects, workOrders, events, parts, documents] = await Promise.all([
    sb.from(MAINTENANCE_SYSTEMS_TABLE).select("id").eq("yacht_id", yachtId).eq("is_active", true),
    sb.from(EQUIPMENT_ASSETS_TABLE).select("id,criticality,operational_status").eq("yacht_id", yachtId).eq("is_active", true),
    sb.from(MAINTENANCE_TASKS_TABLE).select("id,title,status,priority,due_at,due_counter_value,equipment_asset_id").eq("yacht_id", yachtId).limit(500),
    sb.from(DEFECTS_TABLE).select("id,title,status,severity,equipment_asset_id").eq("yacht_id", yachtId).limit(500),
    sb.from(WORK_ORDERS_TABLE).select("id,work_order_number,title,status,priority,safety_critical,risk_level").eq("yacht_id", yachtId).limit(500),
    sb.from(SERVICE_EVENTS_TABLE).select("id,completed_at,cost,currency").eq("yacht_id", yachtId).order("completed_at", { ascending: false }).limit(10),
    sb.from(SPARE_PARTS_TABLE).select("id,quantity_on_hand,minimum_stock,expiry_date").eq("yacht_id", yachtId).limit(500),
    sb.from(MAINTENANCE_DOCUMENTS_TABLE).select("id,title,category,expires_at").eq("yacht_id", yachtId).limit(500),
  ]);
  const rawTasks = tasks.data ?? [];
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const normalizedTasks = rawTasks.map((t) => ({ ...t, status: statusForTask(t as Record<string, unknown>) }));
  const overdueTasks = normalizedTasks.filter((t) => t.status === "overdue");
  const dueSoonTasks = normalizedTasks.filter((t) => t.status === "due");
  const openDefects = (defects.data ?? []).filter((d) => !["closed", "verified", "rejected", "duplicate"].includes(String(d.status)));
  const lowStockParts = (parts.data ?? []).filter((p) => Number(p.quantity_on_hand ?? 0) <= Number(p.minimum_stock ?? 0));
  const expiredParts = (parts.data ?? []).filter((p) => p.expiry_date && new Date(String(p.expiry_date)) < now);
  const datedDocuments = (documents.data ?? []).filter((d) => d.expires_at);
  const expiredDocuments = datedDocuments.filter((d) => new Date(String(d.expires_at)) < now);
  const expiringDocuments = datedDocuments.filter((d) => {
    const expires = new Date(String(d.expires_at));
    return expires >= now && expires <= soon;
  });
  const openWorkOrders = (workOrders.data ?? []).filter((w) => !["closed", "cancelled"].includes(String(w.status)));
  res.json({
    yachtId,
    counts: {
      systems: systems.data?.length ?? 0,
      assets: assets.data?.length ?? 0,
      critical_assets: (assets.data ?? []).filter((a) => ["critical", "safety_critical"].includes(String(a.criticality))).length,
      tasks_due: dueSoonTasks.length,
      tasks_overdue: overdueTasks.length,
      open_defects: openDefects.length,
      critical_defects: openDefects.filter((d) => d.severity === "critical").length,
      open_work_orders: openWorkOrders.length,
      low_stock: lowStockParts.length,
      expired_parts: expiredParts.length,
      expired_documents: expiredDocuments.length,
      expiring_documents: expiringDocuments.length,
    },
    overdue_tasks: overdueTasks.slice(0, 20),
    due_soon_tasks: dueSoonTasks.slice(0, 20),
    open_defects: openDefects.slice(0, 20),
    open_work_orders: openWorkOrders.slice(0, 20),
    recent_service_events: events.data ?? [],
    low_stock_parts: lowStockParts.slice(0, 20),
    expired_parts: expiredParts.slice(0, 20),
    expired_documents: expiredDocuments.slice(0, 20),
    expiring_documents: expiringDocuments.slice(0, 20),
    errors: [systems.error, assets.error, tasks.error, defects.error, workOrders.error, events.error, parts.error, documents.error].filter(Boolean).map((e) => e?.message),
  });
});

router.get("/maintenance/yachts/:yachtId/systems", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data, error } = await sb.from(MAINTENANCE_SYSTEMS_TABLE).select("*").eq("yacht_id", yachtId).eq("is_active", true).order("sort_order");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/systems/seed", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data: templates, error } = await sb.from(MAINTENANCE_SYSTEM_TEMPLATES_TABLE).select("*").eq("is_active", true);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const rows = (templates ?? []).map((t) => ({
    yacht_id: yachtId,
    name: t.name,
    code: t.code,
    category: t.category,
    description: t.description,
    sort_order: t.sort_order,
    created_by: req.userId,
  }));
  const { data, error: upsertError } = await sb.from(MAINTENANCE_SYSTEMS_TABLE).upsert(rows, { onConflict: "yacht_id,code" }).select("*");
  if (upsertError) {
    res.status(500).json({ error: upsertError.message });
    return;
  }
  await audit(yachtId, req.userId, "systems_seeded", "maintenance_system", null, { count: data?.length ?? 0 });
  res.status(201).json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/systems", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const name = s(p["name"]);
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const row = {
    yacht_id: yachtId,
    parent_system_id: s(p["parent_system_id"]),
    name,
    code: s(p["code"]),
    description: s(p["description"]),
    category: s(p["category"]),
    sort_order: n(p["sort_order"]) ?? 0,
    created_by: req.userId,
  };
  const sb = getSupabase()!;
  const { data, error } = await sb.from(MAINTENANCE_SYSTEMS_TABLE).insert(row).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await audit(yachtId, req.userId, "system_created", "maintenance_system", data.id, data);
  res.status(201).json(data);
});

router.get("/maintenance/yachts/:yachtId/assets", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data, error } = await sb
    .from(EQUIPMENT_ASSETS_TABLE)
    .select("*,maintenance_systems(name,code),equipment_locations(name,compartment),equipment_counters(id,counter_type,unit,current_value,is_primary,last_reading_at)")
    .eq("yacht_id", yachtId)
    .eq("is_active", true)
    .order("name");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/assets", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const name = s(p["name"]);
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const parentAssetId = s(p["parent_asset_id"]);
  if (parentAssetId && !(await assetBelongsToYacht(parentAssetId, yachtId))) {
    res.status(400).json({ error: "parent_asset_id must belong to this yacht" });
    return;
  }
  const row = {
    yacht_id: yachtId,
    vessel_system_id: s(p["vessel_system_id"]),
    parent_asset_id: parentAssetId,
    asset_type: s(p["asset_type"]),
    name,
    display_name: s(p["display_name"]) ?? name,
    asset_code: s(p["asset_code"]),
    manufacturer: s(p["manufacturer"]),
    model: s(p["model"]),
    serial_number: s(p["serial_number"]),
    part_number: s(p["part_number"]),
    location_id: s(p["location_id"]),
    criticality: s(p["criticality"]) ?? "normal",
    operational_status: s(p["operational_status"]) ?? "operational",
    condition_status: s(p["condition_status"]),
    warranty_start: s(p["warranty_start"]),
    warranty_end: s(p["warranty_end"]),
    warranty_hours_limit: n(p["warranty_hours_limit"]),
    class_relevant: b(p["class_relevant"]),
    flag_relevant: b(p["flag_relevant"]),
    safety_relevant: b(p["safety_relevant"]),
    environmental_relevant: b(p["environmental_relevant"]),
    photo_urls: jsonArray(p["photo_urls"]),
    document_urls: jsonArray(p["document_urls"]),
    replacement_cost: n(p["replacement_cost"]),
    replacement_cost_currency: s(p["replacement_cost_currency"]) ?? "EUR",
    external_key: s(p["external_key"]),
    created_by: req.userId,
  };
  const sb = getSupabase()!;
  const { data, error } = await sb.from(EQUIPMENT_ASSETS_TABLE).insert(row).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await audit(yachtId, req.userId, "asset_created", "equipment_asset", data.id, data);
  res.status(201).json(data);
});

router.get("/maintenance/yachts/:yachtId/assets/:assetId", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const assetId = req.params["assetId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  if (!(await assetBelongsToYacht(assetId, yachtId))) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  const sb = getSupabase()!;
  const [asset, counters, plans, tasks, workOrders, defects, events, documents] = await Promise.all([
    sb.from(EQUIPMENT_ASSETS_TABLE).select("*,maintenance_systems(name,code),equipment_locations(name,compartment)").eq("id", assetId).single(),
    sb.from(EQUIPMENT_COUNTERS_TABLE).select("*").eq("equipment_asset_id", assetId).order("is_primary", { ascending: false }),
    sb.from(MAINTENANCE_PLANS_TABLE).select("*,maintenance_intervals(*)").eq("equipment_asset_id", assetId).eq("active", true),
    sb.from(MAINTENANCE_TASKS_TABLE).select("*").eq("equipment_asset_id", assetId).order("due_at", { ascending: true }),
    sb.from(WORK_ORDER_ASSETS_TABLE).select("work_orders(*)").eq("equipment_asset_id", assetId),
    sb.from(DEFECTS_TABLE).select("*").eq("equipment_asset_id", assetId).order("reported_at", { ascending: false }),
    sb.from(SERVICE_EVENTS_TABLE).select("*").eq("equipment_asset_id", assetId).order("completed_at", { ascending: false }),
    sb.from(MAINTENANCE_DOCUMENTS_TABLE).select("*").eq("equipment_asset_id", assetId).order("created_at", { ascending: false }),
  ]);
  if (asset.error) {
    res.status(500).json({ error: asset.error.message });
    return;
  }
  res.json({
    item: asset.data,
    counters: counters.data ?? [],
    plans: plans.data ?? [],
    tasks: tasks.data ?? [],
    work_orders: (workOrders.data ?? []).map((r) => r.work_orders).filter(Boolean),
    defects: defects.data ?? [],
    service_events: events.data ?? [],
    documents: documents.data ?? [],
  });
});

router.patch("/maintenance/yachts/:yachtId/assets/:assetId", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const assetId = req.params["assetId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  if (!(await assetBelongsToYacht(assetId, yachtId))) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  const p = body(req);
  if (s(p["parent_asset_id"]) && !(await assetBelongsToYacht(s(p["parent_asset_id"]), yachtId))) {
    res.status(400).json({ error: "parent_asset_id must belong to this yacht" });
    return;
  }
  const allowed = [
    "vessel_system_id", "parent_asset_id", "asset_type", "name", "display_name", "asset_code", "manufacturer", "model",
    "serial_number", "part_number", "location_id", "criticality", "operational_status", "condition_status",
    "warranty_start", "warranty_end", "warranty_hours_limit", "class_relevant", "flag_relevant", "safety_relevant",
    "environmental_relevant", "photo_urls", "document_urls", "replacement_cost", "replacement_cost_currency",
  ];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) if (key in p) patch[key] = p[key];
  const sb = getSupabase()!;
  const { data, error } = await sb.from(EQUIPMENT_ASSETS_TABLE).update(patch).eq("id", assetId).eq("yacht_id", yachtId).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await audit(yachtId, req.userId, "asset_updated", "equipment_asset", assetId, patch);
  res.json(data);
});

router.post("/maintenance/yachts/:yachtId/assets/:assetId/retire", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const assetId = req.params["assetId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const patch = {
    is_active: false,
    operational_status: "decommissioned",
    retired_at: new Date().toISOString(),
    retirement_reason: s(body(req)["retirement_reason"]) ?? "Retired",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from(EQUIPMENT_ASSETS_TABLE).update(patch).eq("id", assetId).eq("yacht_id", yachtId).select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  await audit(yachtId, req.userId, "asset_retired", "equipment_asset", assetId, patch);
  res.json(data);
});

router.post("/maintenance/yachts/:yachtId/assets/:assetId/counters", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const assetId = req.params["assetId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  if (!(await assetBelongsToYacht(assetId, yachtId))) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  const p = body(req);
  const row = {
    equipment_asset_id: assetId,
    counter_type: s(p["counter_type"]) ?? "running_hours",
    unit: s(p["unit"]) ?? "hours",
    current_value: n(p["current_value"]) ?? 0,
    source: s(p["source"]) ?? "manual",
    is_primary: p["is_primary"] !== false,
    last_reading_at: new Date().toISOString(),
  };
  const sb = getSupabase()!;
  const { data, error } = await sb.from(EQUIPMENT_COUNTERS_TABLE).insert(row).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await sb.from(COUNTER_READINGS_TABLE).insert({ counter_id: data.id, value: row.current_value, entered_by: req.userId, notes: "Initial reading" });
  await audit(yachtId, req.userId, "counter_created", "equipment_counter", data.id, data);
  res.status(201).json(data);
});

router.post("/maintenance/yachts/:yachtId/counters/:counterId/readings", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const counterId = req.params["counterId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data: counter, error: counterError } = await sb
    .from(EQUIPMENT_COUNTERS_TABLE)
    .select("*,equipment_assets!inner(id,yacht_id)")
    .eq("id", counterId)
    .eq("equipment_assets.yacht_id", yachtId)
    .maybeSingle();
  if (counterError || !counter) {
    res.status(counterError ? 500 : 404).json({ error: counterError?.message ?? "Counter not found" });
    return;
  }
  const p = body(req);
  const value = n(p["value"]);
  if (value == null) {
    res.status(400).json({ error: "value required" });
    return;
  }
  const currentValue = Number(counter.current_value ?? 0);
  const correctionReason = s(p["correction_reason"]);
  if (value < currentValue && !correctionReason) {
    res.status(400).json({ error: "Lower reading requires correction_reason or reset workflow" });
    return;
  }
  const { data, error } = await sb.from(COUNTER_READINGS_TABLE).insert({
    counter_id: counterId,
    value,
    reading_at: s(p["reading_at"]) ?? new Date().toISOString(),
    reading_source: s(p["reading_source"]) ?? "manual",
    entered_by: req.userId,
    work_order_id: s(p["work_order_id"]),
    service_event_id: s(p["service_event_id"]),
    correction_reason: correctionReason,
    notes: s(p["notes"]),
  }).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await sb.from(EQUIPMENT_COUNTERS_TABLE).update({ current_value: value, last_reading_at: data.reading_at, updated_at: new Date().toISOString() }).eq("id", counterId);
  await audit(yachtId, req.userId, correctionReason ? "counter_corrected" : "counter_reading_recorded", "counter_reading", data.id, data);
  res.status(201).json(data);
});

router.get("/maintenance/yachts/:yachtId/tasks", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const status = s(req.query["status"]);
  const sb = getSupabase()!;
  let query = sb.from(MAINTENANCE_TASKS_TABLE).select("*,equipment_assets(name,manufacturer,model)").eq("yacht_id", yachtId).order("due_at", { ascending: true, nullsFirst: false }).limit(200);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/plans", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const assetId = s(p["equipment_asset_id"]);
  const name = s(p["name"]);
  if (!assetId || !name || !(await assetBelongsToYacht(assetId, yachtId))) {
    res.status(400).json({ error: "valid equipment_asset_id and name required" });
    return;
  }
  const sb = getSupabase()!;
  const { data: plan, error } = await sb.from(MAINTENANCE_PLANS_TABLE).insert({
    yacht_id: yachtId,
    equipment_asset_id: assetId,
    name,
    description: s(p["description"]),
    plan_type: s(p["plan_type"]) ?? "custom",
    priority: s(p["priority"]) ?? "normal",
    criticality: s(p["criticality"]) ?? "normal",
    start_date: s(p["start_date"]) ?? new Date().toISOString().slice(0, 10),
    assigned_to_role: s(p["assigned_to_role"]),
    verification_required: p["verification_required"] !== false,
    created_by: req.userId,
  }).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const intervals = jsonArray(p["intervals"]).map((raw) => {
    const item = typeof raw === "object" && raw != null ? (raw as Record<string, unknown>) : {};
    return {
      maintenance_plan_id: plan.id,
      interval_type: s(item["interval_type"]) ?? "calendar",
      calendar_value: n(item["calendar_value"]),
      calendar_unit: s(item["calendar_unit"]),
      counter_id: s(item["counter_id"]),
      counter_interval: n(item["counter_interval"]),
      cycle_interval: n(item["cycle_interval"]),
      due_rule: s(item["due_rule"]) ?? "whichever_occurs_first",
      warning_threshold: n(item["warning_threshold"]),
      warning_unit: s(item["warning_unit"]),
      next_due_at: s(item["next_due_at"]),
      next_due_counter_value: n(item["next_due_counter_value"]),
    };
  });
  if (intervals.length) await sb.from(MAINTENANCE_INTERVALS_TABLE).insert(intervals);
  await audit(yachtId, req.userId, "maintenance_plan_created", "maintenance_plan", plan.id, { plan, intervals });
  res.status(201).json({ item: plan, intervals });
});

router.post("/maintenance/yachts/:yachtId/plans/:planId/generate-task", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const planId = req.params["planId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data: plan, error } = await sb.from(MAINTENANCE_PLANS_TABLE).select("*,maintenance_intervals(*)").eq("id", planId).eq("yacht_id", yachtId).maybeSingle();
  if (error || !plan) {
    res.status(error ? 500 : 404).json({ error: error?.message ?? "Plan not found" });
    return;
  }
  const firstInterval = Array.isArray(plan.maintenance_intervals) ? plan.maintenance_intervals[0] : null;
  const dueAt = s(firstInterval?.next_due_at) ?? s(body(req)["due_at"]);
  const dueCounter = n(firstInterval?.next_due_counter_value) ?? n(body(req)["due_counter_value"]);
  const key = `${plan.id}:${dueAt ?? "no-date"}:${dueCounter ?? "no-counter"}`;
  const row = {
    yacht_id: yachtId,
    equipment_asset_id: plan.equipment_asset_id,
    maintenance_plan_id: plan.id,
    title: plan.name,
    description: plan.description,
    due_at: dueAt,
    due_counter_value: dueCounter,
    status: statusForTask({ due_at: dueAt, due_counter_value: dueCounter }),
    priority: plan.priority,
    assigned_to_role: plan.assigned_to_role,
    idempotency_key: key,
  };
  const { data, error: upsertError } = await sb.from(MAINTENANCE_TASKS_TABLE).upsert(row, { onConflict: "idempotency_key" }).select("*").single();
  if (upsertError) {
    res.status(500).json({ error: upsertError.message });
    return;
  }
  await audit(yachtId, req.userId, "maintenance_task_generated", "maintenance_task", data.id, data);
  res.status(201).json(data);
});

router.get("/maintenance/yachts/:yachtId/work-orders", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data, error } = await sb.from(WORK_ORDERS_TABLE).select("*,work_order_assets(equipment_asset_id,equipment_assets(name))").eq("yacht_id", yachtId).order("created_at", { ascending: false }).limit(200);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/work-orders", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const title = s(p["title"]);
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const sb = getSupabase()!;
  const { data: numberData } = await sb.rpc("maintenance_next_work_order_number", { p_yacht_id: yachtId });
  const { data, error } = await sb.from(WORK_ORDERS_TABLE).insert({
    yacht_id: yachtId,
    work_order_number: String(numberData ?? `WO-${Date.now()}`),
    title,
    description: s(p["description"]),
    work_order_type: s(p["work_order_type"]) ?? "corrective_maintenance",
    status: s(p["status"]) ?? "requested",
    priority: s(p["priority"]) ?? "normal",
    risk_level: s(p["risk_level"]),
    safety_critical: b(p["safety_critical"]),
    requested_by: req.userId,
    assigned_to_user_id: s(p["assigned_to_user_id"]),
    planned_start: s(p["planned_start"]),
    planned_end: s(p["planned_end"]),
    estimated_labour_hours: n(p["estimated_labour_hours"]),
    estimated_cost: n(p["estimated_cost"]),
    currency: s(p["currency"]) ?? "EUR",
    downtime_expected: b(p["downtime_expected"]),
    permit_required: b(p["permit_required"]),
    risk_assessment_required: b(p["risk_assessment_required"]),
    lockout_tagout_required: b(p["lockout_tagout_required"]),
    quotation_id: s(p["quotation_id"]),
    purchase_order_id: s(p["purchase_order_id"]),
  }).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const assetIds = jsonArray(p["asset_ids"]).map(String).filter((id) => isUuid(id));
  const valid: string[] = [];
  for (const id of assetIds) if (await assetBelongsToYacht(id, yachtId)) valid.push(id);
  if (valid.length) {
    await sb.from(WORK_ORDER_ASSETS_TABLE).insert(valid.map((equipment_asset_id) => ({ work_order_id: data.id, equipment_asset_id })));
  }
  await audit(yachtId, req.userId, "work_order_created", "work_order", data.id, { ...data, asset_ids: valid });
  res.status(201).json({ ...data, asset_ids: valid });
});

router.patch("/maintenance/yachts/:yachtId/work-orders/:workOrderId", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const workOrderId = req.params["workOrderId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const nextStatus = s(p["status"]);
  if (nextStatus === "closed") {
    const sb = getSupabase()!;
    const { count } = await sb.from(SERVICE_EVENTS_TABLE).select("id", { count: "exact", head: true }).eq("work_order_id", workOrderId).eq("yacht_id", yachtId);
    if (!count) {
      res.status(400).json({ error: "Cannot close work order without linked service event" });
      return;
    }
  }
  const allowed = [
    "status", "priority", "approved_by", "assigned_to_user_id", "assigned_vendor_id", "actual_start", "actual_end",
    "actual_labour_hours", "actual_cost", "completion_summary", "verification_notes", "risk_level", "planned_start",
    "planned_end", "estimated_labour_hours", "estimated_cost", "downtime_expected", "permit_required",
    "risk_assessment_required", "lockout_tagout_required", "quotation_id", "purchase_order_id",
  ];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) if (key in p) patch[key] = p[key];
  if (nextStatus === "closed") {
    patch["closed_at"] = new Date().toISOString();
    patch["closed_by"] = req.userId;
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.from(WORK_ORDERS_TABLE).update(patch).eq("id", workOrderId).eq("yacht_id", yachtId).select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Work order not found" });
    return;
  }
  await audit(yachtId, req.userId, "work_order_updated", "work_order", workOrderId, patch);
  res.json(data);
});

router.get("/maintenance/yachts/:yachtId/defects", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data, error } = await sb.from(DEFECTS_TABLE).select("*,equipment_assets(name)").eq("yacht_id", yachtId).order("reported_at", { ascending: false }).limit(200);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/defects", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const title = s(p["title"]);
  const assetId = s(p["equipment_asset_id"]);
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  if (assetId && !(await assetBelongsToYacht(assetId, yachtId))) {
    res.status(400).json({ error: "equipment_asset_id must belong to this yacht" });
    return;
  }
  const sb = getSupabase()!;
  const { data: numberData } = await sb.rpc("maintenance_next_defect_number", { p_yacht_id: yachtId });
  const row = {
    yacht_id: yachtId,
    equipment_asset_id: assetId,
    defect_number: String(numberData ?? `DEF-${Date.now()}`),
    title,
    description: s(p["description"]),
    severity: s(p["severity"]) ?? "medium",
    priority: s(p["priority"]) ?? "normal",
    status: s(p["status"]) ?? "reported",
    operational_limitation: s(p["operational_limitation"]),
    safety_impact: s(p["safety_impact"]),
    environmental_impact: s(p["environmental_impact"]),
    reported_by: req.userId,
    counter_value_at_report: n(p["counter_value_at_report"]),
    detected_during_type: s(p["detected_during_type"]),
    detected_during_id: uuid(p["detected_during_id"]),
    temporary_repair: s(p["temporary_repair"]),
    temporary_repair_expiry: s(p["temporary_repair_expiry"]),
    warranty_claim_id: uuid(p["warranty_claim_id"]),
    photo_urls: jsonArray(p["photo_urls"]),
  };
  const { data, error } = await sb.from(DEFECTS_TABLE).insert(row).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await audit(yachtId, req.userId, "defect_created", "defect", data.id, data);
  res.status(201).json(data);
});

router.patch("/maintenance/yachts/:yachtId/defects/:defectId", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const defectId = req.params["defectId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const allowed = [
    "status", "priority", "severity", "description", "operational_limitation", "safety_impact", "environmental_impact",
    "temporary_repair", "temporary_repair_expiry", "work_order_id", "warranty_claim_id", "photo_urls",
  ];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) if (key in p) patch[key] = p[key];
  if ("work_order_id" in p) patch["work_order_id"] = uuid(p["work_order_id"]);
  if ("warranty_claim_id" in p) patch["warranty_claim_id"] = uuid(p["warranty_claim_id"]);
  const status = s(p["status"]);
  if (status === "resolved") patch["resolved_at"] = new Date().toISOString();
  if (status === "verified") {
    patch["verified_at"] = new Date().toISOString();
    patch["verified_by"] = req.userId;
  }
  if (status === "closed") patch["closed_at"] = new Date().toISOString();
  const sb = getSupabase()!;
  const { data, error } = await sb.from(DEFECTS_TABLE).update(patch).eq("id", defectId).eq("yacht_id", yachtId).select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Defect not found" });
    return;
  }
  await audit(yachtId, req.userId, "defect_updated", "defect", defectId, patch);
  res.json(data);
});

router.get("/maintenance/yachts/:yachtId/service-events", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data, error } = await sb.from(SERVICE_EVENTS_TABLE).select("*,equipment_assets(name),maintenance_vendors(name)").eq("yacht_id", yachtId).order("completed_at", { ascending: false }).limit(200);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/service-events", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const assetId = s(p["equipment_asset_id"]);
  const title = s(p["title"]);
  const workPerformed = s(p["work_performed"]);
  if (!assetId || !title || !workPerformed || !(await assetBelongsToYacht(assetId, yachtId))) {
    res.status(400).json({ error: "valid equipment_asset_id, title and work_performed required" });
    return;
  }
  const sb = getSupabase()!;
  const { data: numberData } = await sb.rpc("maintenance_next_service_event_number", { p_yacht_id: yachtId });
  const row = {
    yacht_id: yachtId,
    equipment_asset_id: assetId,
    work_order_id: s(p["work_order_id"]),
    maintenance_task_id: s(p["maintenance_task_id"]),
    service_event_number: String(numberData ?? `SE-${Date.now()}`),
    service_type: s(p["service_type"]) ?? "manual_service",
    title,
    started_at: s(p["started_at"]),
    completed_at: s(p["completed_at"]) ?? new Date().toISOString(),
    counter_value_before: n(p["counter_value_before"]),
    counter_value_after: n(p["counter_value_after"]),
    defect_description: s(p["defect_description"]),
    root_cause_summary: s(p["root_cause_summary"]),
    work_performed: workPerformed,
    technician_id: s(p["technician_id"]) ?? s(p["performed_by_name"]),
    vendor_id: s(p["vendor_id"]),
    authorised_dealer: b(p["authorised_dealer"]),
    labour_hours: n(p["labour_hours"]),
    downtime_hours: n(p["downtime_hours"]),
    measurements_before: typeof p["measurements_before"] === "object" && p["measurements_before"] != null ? p["measurements_before"] : {},
    measurements_after: typeof p["measurements_after"] === "object" && p["measurements_after"] != null ? p["measurements_after"] : {},
    parts_used: jsonArray(p["parts_used"]),
    fluids_used: jsonArray(p["fluids_used"]),
    test_result: s(p["test_result"]),
    cost: n(p["cost"]),
    currency: s(p["currency"]) ?? "EUR",
    next_due_at: s(p["next_due_at"]),
    next_due_counter_value: n(p["next_due_counter_value"]),
    approved_by: s(p["approved_by"]),
    approved_at: s(p["approved_by"]) ? new Date().toISOString() : null,
    signed_off_by: s(p["signed_off_by"]) ?? req.userId,
    signed_off_at: s(p["signed_off_by"]) || p["signed_off_by"] == null ? new Date().toISOString() : null,
    created_by: req.userId,
  };
  const { data, error } = await sb.from(SERVICE_EVENTS_TABLE).insert(row).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (row.maintenance_task_id) {
    await sb.from(MAINTENANCE_TASKS_TABLE).update({ status: "completed", completed_at: row.completed_at, work_order_id: row.work_order_id, updated_at: new Date().toISOString() }).eq("id", row.maintenance_task_id).eq("yacht_id", yachtId);
  }
  if (row.work_order_id) {
    await sb.from(WORK_ORDERS_TABLE).update({ status: "completed", actual_end: row.completed_at, completion_summary: row.work_performed, updated_at: new Date().toISOString() }).eq("id", row.work_order_id).eq("yacht_id", yachtId);
  }
  await audit(yachtId, req.userId, "service_event_created", "service_event", data.id, data);
  res.status(201).json(data);
});

router.post("/maintenance/yachts/:yachtId/service-events/:eventId/corrections", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const eventId = req.params["eventId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const fieldName = s(p["field_name"]);
  const reason = s(p["correction_reason"]);
  if (!fieldName || !reason) {
    res.status(400).json({ error: "field_name and correction_reason required" });
    return;
  }
  const sb = getSupabase()!;
  const { data: event } = await sb.from(SERVICE_EVENTS_TABLE).select("*").eq("id", eventId).eq("yacht_id", yachtId).maybeSingle();
  if (!event) {
    res.status(404).json({ error: "Service event not found" });
    return;
  }
  const row = {
    service_event_id: eventId,
    field_name: fieldName,
    previous_value: fieldName in event ? event[fieldName as keyof typeof event] : null,
    corrected_value: p["corrected_value"] ?? null,
    correction_reason: reason,
    requested_by: req.userId,
  };
  const { data, error } = await sb.from(SERVICE_EVENT_CORRECTIONS_TABLE).insert(row).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await audit(yachtId, req.userId, "service_event_correction_created", "service_event_correction", data.id, data);
  res.status(201).json(data);
});

router.get("/maintenance/yachts/:yachtId/parts", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data, error } = await sb.from(SPARE_PARTS_TABLE).select("*").eq("yacht_id", yachtId).order("name").limit(500);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/parts", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const name = s(p["name"]);
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const sb = getSupabase()!;
  const quantity = n(p["quantity_on_hand"]) ?? 0;
  const assetId = uuid(p["equipment_asset_id"]);
  const { data, error } = await sb.from(SPARE_PARTS_TABLE).insert({
    yacht_id: yachtId,
    equipment_asset_id: assetId,
    part_number: s(p["part_number"]),
    name,
    manufacturer: s(p["manufacturer"]),
    compatible_asset_ids: jsonArray(p["compatible_asset_ids"]).map(String).filter((id) => isUuid(id)),
    quantity_on_hand: quantity,
    minimum_stock: n(p["minimum_stock"]) ?? 0,
    reorder_level: n(p["reorder_level"]) ?? 0,
    unit: s(p["unit"]) ?? "pcs",
    unit_cost: n(p["unit_cost"]),
    currency: s(p["currency"]) ?? "EUR",
    expiry_date: s(p["expiry_date"]),
    notes: s(p["notes"]),
  }).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (quantity) {
    await sb.from(INVENTORY_MOVEMENTS_TABLE).insert({
      yacht_id: yachtId,
      spare_part_id: data.id,
      movement_type: "receive",
      quantity,
      previous_quantity: 0,
      next_quantity: quantity,
      created_by: req.userId,
      notes: "Initial stock",
    });
  }
  await audit(yachtId, req.userId, "part_created", "spare_part", data.id, data);
  res.status(201).json(data);
});

router.patch("/maintenance/yachts/:yachtId/parts/:partId", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const partId = req.params["partId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = ["part_number", "name", "manufacturer", "minimum_stock", "reorder_level", "unit", "unit_cost", "currency", "expiry_date", "notes"];
  for (const key of allowed) if (key in p) patch[key] = p[key];
  if ("equipment_asset_id" in p) patch["equipment_asset_id"] = uuid(p["equipment_asset_id"]);
  if ("compatible_asset_ids" in p) patch["compatible_asset_ids"] = jsonArray(p["compatible_asset_ids"]).map(String).filter((id) => isUuid(id));
  const sb = getSupabase()!;
  const { data, error } = await sb.from(SPARE_PARTS_TABLE).update(patch).eq("id", partId).eq("yacht_id", yachtId).select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Spare part not found" });
    return;
  }
  await audit(yachtId, req.userId, "part_updated", "spare_part", partId, patch);
  res.json(data);
});

router.post("/maintenance/yachts/:yachtId/parts/:partId/movements", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  const partId = req.params["partId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const quantity = n(p["quantity"]);
  const movementType = s(p["movement_type"]) ?? "adjust";
  if (quantity == null || quantity <= 0) {
    res.status(400).json({ error: "positive quantity required" });
    return;
  }
  const sb = getSupabase()!;
  const { data: part, error: partError } = await sb.from(SPARE_PARTS_TABLE).select("*").eq("id", partId).eq("yacht_id", yachtId).maybeSingle();
  if (partError || !part) {
    res.status(partError ? 500 : 404).json({ error: partError?.message ?? "Spare part not found" });
    return;
  }
  const previous = Number(part.quantity_on_hand ?? 0);
  const direction = ["consume", "reserve", "scrap", "transfer"].includes(movementType) ? -1 : 1;
  const next = Math.max(0, previous + direction * quantity);
  const { data, error } = await sb.from(INVENTORY_MOVEMENTS_TABLE).insert({
    yacht_id: yachtId,
    spare_part_id: partId,
    work_order_id: uuid(p["work_order_id"]),
    service_event_id: uuid(p["service_event_id"]),
    movement_type: movementType,
    quantity,
    previous_quantity: previous,
    next_quantity: next,
    notes: s(p["notes"]),
    created_by: req.userId,
  }).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await sb.from(SPARE_PARTS_TABLE).update({ quantity_on_hand: next, updated_at: new Date().toISOString() }).eq("id", partId).eq("yacht_id", yachtId);
  await audit(yachtId, req.userId, "inventory_movement_created", "inventory_movement", data.id, data);
  res.status(201).json(data);
});

router.get("/maintenance/yachts/:yachtId/documents", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const sb = getSupabase()!;
  const { data, error } = await sb
    .from(MAINTENANCE_DOCUMENTS_TABLE)
    .select("*,equipment_assets(name),work_orders(work_order_number,title),service_events(service_event_number,title),defects(defect_number,title)")
    .eq("yacht_id", yachtId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data ?? [] });
});

router.post("/maintenance/yachts/:yachtId/documents", async (req, res) => {
  const yachtId = req.params["yachtId"]!;
  if (!(await assertYacht(req, res, yachtId))) return;
  const p = body(req);
  const title = s(p["title"]);
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const row = {
    yacht_id: yachtId,
    equipment_asset_id: uuid(p["equipment_asset_id"]),
    work_order_id: uuid(p["work_order_id"]),
    service_event_id: uuid(p["service_event_id"]),
    defect_id: uuid(p["defect_id"]),
    category: s(p["category"]) ?? "document",
    title,
    file_url: s(p["file_url"]),
    file_path: s(p["file_path"]),
    mime_type: s(p["mime_type"]),
    expires_at: s(p["expires_at"]),
    is_private: p["is_private"] !== false,
    version: n(p["version"]) ?? 1,
    uploaded_by: req.userId,
  };
  const sb = getSupabase()!;
  const { data, error } = await sb.from(MAINTENANCE_DOCUMENTS_TABLE).insert(row).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await audit(yachtId, req.userId, "maintenance_document_created", "maintenance_document", data.id, data);
  res.status(201).json(data);
});

router.post("/maintenance/yachts/:yachtId/documents/upload", attachmentUploadMw, async (req, res) => {
  const yachtId = String(req.params["yachtId"]);
  if (!(await assertYacht(req, res, yachtId))) return;
  if (!req.file) {
    res.status(400).json({ error: "file required" });
    return;
  }

  const p = body(req);
  const mimeType = req.file.mimetype || s(p["mime_type"]) || "application/octet-stream";
  const ext = fileExtension(req.file.originalname, mimeType);
  const safeName = storageFileName(req.file.originalname);
  const objectPath = `maintenance/${yachtId}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${safeName}.${ext}`;
  const sb = getSupabase()!;

  await ensureMaintenanceAttachmentsBucket();
  const { error: uploadError } = await sb.storage
    .from(MAINTENANCE_ATTACHMENTS_BUCKET)
    .upload(objectPath, req.file.buffer, {
      contentType: mimeType,
      upsert: false,
    });
  if (uploadError) {
    req.log.error({ err: uploadError.message }, "Maintenance attachment upload failed");
    res.status(500).json({ error: uploadError.message });
    return;
  }

  const row = {
    yacht_id: yachtId,
    equipment_asset_id: uuid(p["equipment_asset_id"]),
    work_order_id: uuid(p["work_order_id"]),
    service_event_id: uuid(p["service_event_id"]),
    defect_id: uuid(p["defect_id"]),
    category: s(p["category"]) ?? (mimeType.startsWith("image/") ? "photo" : "document"),
    title: s(p["title"]) ?? req.file.originalname ?? "Maintenance attachment",
    file_url: null,
    file_path: objectPath,
    mime_type: mimeType,
    expires_at: s(p["expires_at"]),
    is_private: p["is_private"] !== "false" && p["is_private"] !== false,
    version: n(p["version"]) ?? 1,
    uploaded_by: req.userId,
  };
  const { data, error } = await sb.from(MAINTENANCE_DOCUMENTS_TABLE).insert(row).select("*").single();
  if (error) {
    await sb.storage.from(MAINTENANCE_ATTACHMENTS_BUCKET).remove([objectPath]).catch(() => undefined);
    res.status(500).json({ error: error.message });
    return;
  }
  await audit(yachtId, req.userId, "maintenance_document_uploaded", "maintenance_document", data.id, data);
  res.status(201).json(data);
});

router.get("/maintenance/yachts/:yachtId/documents/:documentId/signed-url", async (req, res) => {
  const yachtId = String(req.params["yachtId"]);
  const documentId = String(req.params["documentId"]);
  if (!(await assertYacht(req, res, yachtId))) return;
  if (!isUuid(documentId)) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  const sb = getSupabase()!;
  const { data: doc, error } = await sb
    .from(MAINTENANCE_DOCUMENTS_TABLE)
    .select("id,file_url,file_path")
    .eq("id", documentId)
    .eq("yacht_id", yachtId)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!doc) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  if (doc.file_url && !doc.file_path) {
    res.json({ url: doc.file_url });
    return;
  }
  if (!doc.file_path) {
    res.status(404).json({ error: "Attachment file is missing" });
    return;
  }
  const signed = await sb.storage.from(MAINTENANCE_ATTACHMENTS_BUCKET).createSignedUrl(doc.file_path, 15 * 60);
  if (signed.error) {
    res.status(500).json({ error: signed.error.message });
    return;
  }
  res.json({ url: signed.data.signedUrl });
});

router.patch("/maintenance/yachts/:yachtId/documents/:documentId", async (req, res) => {
  const yachtId = String(req.params["yachtId"]);
  const documentId = String(req.params["documentId"]);
  if (!(await assertYacht(req, res, yachtId))) return;
  if (!isUuid(documentId)) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  const p = body(req);
  const title = s(p["title"]);
  if (!title) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const update = {
    equipment_asset_id: uuid(p["equipment_asset_id"]),
    work_order_id: uuid(p["work_order_id"]),
    service_event_id: uuid(p["service_event_id"]),
    defect_id: uuid(p["defect_id"]),
    category: s(p["category"]) ?? "document",
    title,
    file_url: s(p["file_url"]),
    mime_type: s(p["mime_type"]),
    expires_at: s(p["expires_at"]),
    is_private: p["is_private"] !== false,
    version: n(p["version"]) ?? 1,
  };
  const sb = getSupabase()!;
  const { data, error } = await sb
    .from(MAINTENANCE_DOCUMENTS_TABLE)
    .update(update)
    .eq("id", documentId)
    .eq("yacht_id", yachtId)
    .select("*")
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  await audit(yachtId, req.userId, "maintenance_document_updated", "maintenance_document", data.id, data);
  res.json(data);
});

router.delete("/maintenance/yachts/:yachtId/documents/:documentId", async (req, res) => {
  const yachtId = String(req.params["yachtId"]);
  const documentId = String(req.params["documentId"]);
  if (!(await assertYacht(req, res, yachtId))) return;
  if (!isUuid(documentId)) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  const sb = getSupabase()!;
  const { data: doc, error: readError } = await sb
    .from(MAINTENANCE_DOCUMENTS_TABLE)
    .select("id,file_path")
    .eq("id", documentId)
    .eq("yacht_id", yachtId)
    .maybeSingle();
  if (readError) {
    res.status(500).json({ error: readError.message });
    return;
  }
  if (!doc) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  const { error } = await sb
    .from(MAINTENANCE_DOCUMENTS_TABLE)
    .delete()
    .eq("id", documentId)
    .eq("yacht_id", yachtId);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (doc.file_path) {
    await sb.storage.from(MAINTENANCE_ATTACHMENTS_BUCKET).remove([doc.file_path]).catch(() => undefined);
  }
  await audit(yachtId, req.userId, "maintenance_document_deleted", "maintenance_document", documentId, { id: documentId });
  res.status(204).send();
});

export default router;
