# Yachtworth Maintenance V1

Yachtworth Maintenance is the PMS/CMMS foundation for yacht ownership, management, and survey follow-up. It is not a simple service log. V1 introduces a structured maintenance data model that can support planned maintenance, defects, work orders, immutable service history, inventory, vendors, and future AI assistance.

## Scope

V1 is intentionally a production-safe foundation:

- Equipment hierarchy per yacht.
- Professional system taxonomy seeded from templates.
- Asset counters and counter readings.
- Maintenance plans with calendar / running-hour / cycle intervals.
- Generated tasks and status calculation.
- Work orders.
- Defects and risk metadata.
- Immutable service events with correction records.
- Spare parts and inventory movements.
- Maintenance document/photo metadata and private storage bucket.
- Attachment upload, signed private opening, edit and delete actions.
- Audit events for key mutations.
- Shared API for mobile and desktop clients.

## Core Workflow

1. Select a yacht from My Yacht.
2. Seed professional system taxonomy.
3. Add equipment assets under systems.
4. Add counters where relevant.
5. Create a maintenance plan.
6. Generate tasks from the plan.
7. Open work orders or defects.
8. Complete service and save service history.
9. Manage critical spare parts.

## Data Principles

- `yachts` remains the vessel master table.
- Maintenance data is kept in dedicated tables and references `yachts.id`.
- Existing simple `yacht_equipment` data is not overwritten by V1.
- Service history is append-only. Corrections are stored in `service_event_corrections`.
- Duplicate serial numbers are not blocked at database level; the index supports future duplicate warnings.
- Manufacturer maintenance intervals are not fabricated. They must come from manuals, user input, or verified templates.

## API

All endpoints are under `/api/maintenance` and require Clerk authentication. The API uses Supabase service-role access on the server and applies yacht ownership checks before returning or mutating data.

Main endpoint groups:

- `/system-templates`
- `/yachts/:yachtId/dashboard`
- `/yachts/:yachtId/systems`
- `/yachts/:yachtId/assets`
- `/yachts/:yachtId/tasks`
- `/yachts/:yachtId/plans`
- `/yachts/:yachtId/work-orders`
- `/yachts/:yachtId/defects`
- `/yachts/:yachtId/service-events`
- `/yachts/:yachtId/parts`

## UI

The first UI is a working operations screen:

- Overview dashboard.
- Equipment register.
- Plan and task creation.
- Work order creation.
- Defect reporting.
- Service event creation.
- Spare parts register.
- Attachment register with manual links, direct file/photo upload, private signed-file access, edit and delete.

The same route is available to the mobile Expo app and the desktop web build. It uses the existing Clerk token and Render backend base URL.

## Next Version

The next iteration should add:

- Asset photo capture directly into equipment cards.
- Vendor directory UI.
- Offline queue for maintenance mutations.
- Checklist templates from verified manuals.
- Work-order PDF / export.
- Crew role permissions.
- Maintenance calendar.
- AI assistant for manual extraction and failure-pattern summaries.
