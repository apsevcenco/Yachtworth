# Yachtworth Maintenance Data Governance

## Ownership

Every maintenance record belongs to a yacht through `yacht_id`. API access first verifies that the authenticated Clerk user owns the yacht record. No maintenance endpoint should bypass this yacht ownership check.

## Immutable Records

`service_events` are treated as immutable service history. If a past service entry must be changed, the correction is stored in `service_event_corrections` with the previous value, corrected value, reason, requester, and timestamp.

## Evidence

Documents are stored as metadata in `maintenance_documents` and files should be placed in the private `maintenance-documents` Supabase bucket. Future UI should expose upload, expiry tracking, and document review status.

## Manufacturer Data

Maintenance intervals must not be invented. Acceptable sources are:

- OEM manuals.
- Class or flag requirements.
- Yard or service-provider written recommendations.
- User-entered maintenance plan intervals.
- Verified Yachtworth templates with source metadata.

AI may summarize or normalize entered data, but it must not create manufacturer interval facts without source attribution.

## Audit

Important create/update actions write to `maintenance_audit_events`. This is the foundation for future manager review, crew accountability, and insurance-facing evidence trails.
