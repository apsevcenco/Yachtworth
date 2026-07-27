# Yachtworth Flag Advisor V1

## Purpose

Yachtworth Flag Advisor is a professional registry intelligence module for yacht owners, brokers and advisors. V1 is a structured knowledge base and comparison tool. It is not an autonomous legal, tax or VAT adviser.

## Current Project Architecture

- Frontend: Expo / React Native with Expo Router, shared mobile and web routes.
- Backend: Express API server under `artifacts/api-server`.
- Database: Supabase Postgres accessed through `@supabase/supabase-js` service-role client.
- Authentication: Clerk tokens passed from the app to the API; protected routes use `softClerkAuth()` and `requireAuth()` where user-owned data is involved.
- Migrations: numbered SQL files in `migrations/`.
- Existing Flag UI: `artifacts/yachtworth-app/app/flag-intelligence.tsx`.
- Existing Flag API: `artifacts/api-server/src/routes/flagIntelligence.ts`.

## Database Model

V1 extends `flag_registries` and adds:

- `flag_fee_rules`: official registry fee records, fixed amounts and original formulas.
- `flag_sources`: official/source index with checked dates.
- `flag_required_documents`: future document checklist structure.
- `flag_change_log`: audit trail for future admin edits.
- `flag_import_runs`: import-run metadata, workbook hash and report.
- local flag asset metadata on `flag_registries`:
  `flag_code`, `flag_asset_key`, `flag_asset_path`, `flag_alt_text`,
  `registry_badge`, `flag_note`, `flag_asset_source`,
  `flag_asset_license`, `flag_asset_updated_at`.

Existing lightweight columns remain for backwards compatibility with the previous Flag Intelligence screen.

## Excel Mapping

Source workbook: `Yachtworth_Flag_Registry_Base_v1.xlsx`.

- `Flag_Master` maps to `flag_registries`.
- `Fee_Schedules` maps to `flag_fee_rules`.
- `Source_Index` maps to `flag_sources`.
- `Overview` and `Field_Definitions` inform governance and UI/data policy.

The importer preserves original rows as JSON and does not invent missing data.

## Flag Assets

Flag artwork uses the open-source `flag-icons@7.5.0` package, 4x3 SVG variants, under the MIT License.

Only required SVG files are copied into the app bundle:

`artifacts/yachtworth-app/assets/flags/4x3/`

The UI renders them through the reusable `RegistryFlag` component. The component keeps a 4:3 rectangle, uses a subtle border and neutral background, and renders a neutral fallback if an asset is missing. It does not use flag emoji, circular masks, remote CDN images or hotlinked runtime assets.

Exact mapping:

- Cayman Islands: `ky.svg`
- Malta: `mt.svg`
- Marshall Islands: `mh.svg`
- Isle of Man: `im.svg`
- Jersey: `je.svg`
- Guernsey: `gg.svg`
- Gibraltar: `gi.svg`
- United Kingdom: `gb.svg`
- France: `fr.svg`
- Italy: `it.svg`
- Spain: `es.svg`
- Netherlands: `nl.svg`
- Portugal: `pt.svg`
- Madeira (MAR): `pt.svg`
- Cyprus: `cy.svg`
- Panama: `pa.svg`
- Belize: `bz.svg`
- Jamaica: `jm.svg`
- Cook Islands: `ck.svg`
- San Marino: `sm.svg`
- Luxembourg: `lu.svg`

### Madeira Rule

Madeira International Shipping Register is a Portuguese international register. Yachts registered in MAR fly the Portuguese national flag, so Yachtworth uses `pt.svg`, keeps the display name `Madeira (MAR)`, shows the `MAR` badge, and stores the clarification:

`Yachts registered in MAR fly the Portuguese flag.`

Do not replace this with a regional Madeira flag.

## Status Values

Controlled status values:

- `yes`
- `no`
- `partial`
- `case_dependent`
- `not_confirmed`
- `not_applicable`
- `quote_required`

Human phrases such as "Not confirmed", "Case-dependent" and "Quote required" must remain warnings, not conclusions.

## Fee Calculation Rules

The preliminary estimator only sums confirmed fixed fee rows where:

- a numeric amount exists;
- a currency exists;
- the row matches the selected flag and registration type where possible.

Formula rows and quote-required rows are displayed separately. External costs are excluded unless the database contains an explicit confirmed registry fee row.

## Import Process

Reusable importer:

```bash
python scripts/import_flag_advisor_workbook.py "C:\path\to\Yachtworth_Flag_Registry_Base_v1.xlsx" --out exports/flag_advisor
```

The importer:

- validates required sheets and columns;
- checks duplicate registry rows;
- validates currencies;
- generates idempotent SQL upserts;
- records workbook filename, hash and source version;
- writes an import report JSON.

Apply order:

1. Run `migrations/032_flag_advisor_foundation.sql`.
2. Run `migrations/033_flag_registry_assets.sql`.
3. Run generated `exports/flag_advisor/flag_advisor_import.sql`.

The importer contains the same explicit flag mapping and will fail if a new registry has no configured asset. This is intentional: new flag data must be reviewed before production use.

## API

Public/professional read routes:

- `GET /api/flag-registries`
- `GET /api/flag-advisor/registries/:slug`
- `GET /api/flag-advisor/fee-rules`
- `GET /api/flag-advisor/sources`
- `POST /api/flag-advisor/estimate-fees`
- `POST /api/flag-intelligence/compare`

Admin/foundation read routes:

- `GET /api/flag-advisor/import-history`
- `GET /api/flag-advisor/change-history`

Future write routes must validate admin permissions before editing data.

## UI Routes

- `/flag-intelligence`

Modes:

- `All Flags`: expandable registry cards.
- `Registration Advice`: existing ranked guidance.
- `Comparison`: side-by-side registry comparison.
- `Fee Estimate`: preliminary confirmed registry-fee estimate.
- `/flag-admin`: read-only administration view for registries, fees, sources, data quality and import history, including flag preview and stored flag asset fields.

## Data Quality

Data quality is separate from recommendation score.

Display labels:

- `production_ready`
- `usable_with_warnings`
- `research_required`

Rows marked partial default to `research_required`.

## Known Limitations

- Admin edit UI is not yet complete.
- Fee formulas are preserved but not fully calculated unless unambiguous fixed amounts exist.
- Source-level references are stored and exposed, but individual field-level source references are a future enhancement.
- Legal partner placement is structurally supported through `legal_partners`, but no commercial workflow is implemented yet.

## Future Recommendation Engine

The next version should add a transparent recommendation engine that labels:

- confirmed facts;
- derived results;
- professional assumptions;
- unverified information;
- missing information.

AI text can explain tradeoffs, but the database remains the source of factual truth.
