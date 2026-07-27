# Yachtworth Maintenance Offline Architecture

V1 stores maintenance data online through the Render API and Supabase. Offline maintenance is intentionally documented as the next implementation layer because a PMS used onboard must tolerate poor marina and sea connectivity.

## Target Model

- Local queue for creates and updates.
- Temporary local IDs for new assets, defects, work orders, and readings.
- Sync status per mutation: `pending`, `syncing`, `synced`, `failed`, `conflict`.
- Retry with exponential backoff.
- Conflict screen for records edited both locally and remotely.
- Attachment upload queue for photos, PDFs, invoices, manuals, and audio.

## Conflict Rules

- Service events remain append-only.
- Counter readings keep all submitted readings with timestamps.
- Defects and work orders use last-writer for notes but preserve audit events.
- Asset master data conflicts should require user confirmation.

## Storage

Mobile should use local encrypted storage for queued mutations where available. Large files should remain in app-local file storage until upload succeeds.
