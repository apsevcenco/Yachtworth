from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

migration = (ROOT / "migrations" / "034_maintenance_v1_foundation.sql").read_text(encoding="utf-8")
route = (ROOT / "artifacts" / "api-server" / "src" / "routes" / "maintenance.ts").read_text(encoding="utf-8")
routes_index = (ROOT / "artifacts" / "api-server" / "src" / "routes" / "index.ts").read_text(encoding="utf-8")
app_screen = (ROOT / "artifacts" / "yachtworth-app" / "app" / "maintenance.tsx").read_text(encoding="utf-8")
tools = (ROOT / "artifacts" / "yachtworth-app" / "app" / "(tabs)" / "tools.tsx").read_text(encoding="utf-8")

required_tables = [
    "maintenance_system_templates",
    "maintenance_systems",
    "equipment_locations",
    "maintenance_vendors",
    "equipment_assets",
    "equipment_counters",
    "counter_readings",
    "asset_relationships",
    "maintenance_templates",
    "maintenance_template_tasks",
    "maintenance_plans",
    "maintenance_intervals",
    "maintenance_tasks",
    "work_orders",
    "work_order_assets",
    "work_order_tasks",
    "service_events",
    "service_event_corrections",
    "defects",
    "spare_parts",
    "inventory_movements",
    "maintenance_documents",
    "maintenance_audit_events",
    "maintenance_notifications",
]

for table in required_tables:
    assert f"public.{table}" in migration, f"missing table {table}"

assert "create table if not exists public.yachts" not in migration, "migration must not recreate yachts"
assert "create unique index if not exists equipment_assets_serial_warning_idx" not in migration
assert "maintenance-next" not in migration.lower()
assert "maintenance-documents" in migration
assert "service_event_corrections" in migration
assert "insert into public.maintenance_system_templates" in migration

required_endpoints = [
    '"/maintenance/system-templates"',
    '"/maintenance/yachts/:yachtId/dashboard"',
    '"/maintenance/yachts/:yachtId/systems"',
    '"/maintenance/yachts/:yachtId/systems/seed"',
    '"/maintenance/yachts/:yachtId/assets"',
    '"/maintenance/yachts/:yachtId/tasks"',
    '"/maintenance/yachts/:yachtId/plans"',
    '"/maintenance/yachts/:yachtId/work-orders"',
    '"/maintenance/yachts/:yachtId/defects"',
    '"/maintenance/yachts/:yachtId/service-events"',
    '"/maintenance/yachts/:yachtId/parts"',
]

for endpoint in required_endpoints:
    assert endpoint in route, f"missing endpoint {endpoint}"

assert "forClerkUser" in route
assert "assertYacht(req, res, yachtId)" in route
assert "maintenanceRouter" in routes_index
assert 'route: "/maintenance"' in tools
assert "Yachtworth Maintenance" in tools
assert "getMaintenanceDashboard" in app_screen
assert "seedMaintenanceSystems" in app_screen

print("maintenance foundation checks passed")
