# Yachtworth

Standalone luxury mobile app (iOS + Android) — AI-powered yacht **estimates** + Charter ROI + Annual Cost calculator + Charter Planner + Yacht Profile hub. Spinoff from PDYE; separate brand, shared backend.

## Product

- **Audience:** yacht owners + brokers/surveyors
- **Branding:** deep navy `#0B1E3F` + champagne gold `#C9A961`. Gilroy (headings) + Inter (body). Dark only (Light v1.1+).
- **PDYE cross-link:** "by the team behind PDYE" in onboarding; "Powered by PDYE" block in Settings → opens `pdyegroup.com` in in-app browser.
- **Legal:** every estimate result + ROI + cost has server-injected disclaimer ("indicative market estimate · not a certified appraisal · valid 30 days").

## Stack

- **Frontend:** Expo React Native — `artifacts/yachtworth-app` (single codebase iOS+Android)
- **Backend:** shared `artifacts/api-server` Express 5 at `/api`
- **DB:** Supabase project `yachtworth-prod` (Frankfurt). RLS `deny_all` on all tables, service-role bypasses. Scoping by `clerk_user_id` everywhere → no IDOR.
- **Auth:** Clerk (Apple SSO + Google SSO + email/password). `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (frontend) + `CLERK_SECRET_KEY` (backend gate).
- **AI:** OpenAI `gpt-5-mini` via Responses API + `web_search_preview` tool; fallback `/chat/completions`; final deterministic heuristic fallback so AI never causes 500. Key resolution: user's `YACHTWORTH_OPENAI_API_KEY` → Replit AI Integrations proxy.
- **Subscriptions (planned, Day 6):** RevenueCat. Pro €49.99/mo, Basic €19.99/mo, Free 1 estimate/month, 7-day trial.
- **Deployment:** Render (separate service from PDYE).

## Repo layout

- `artifacts/yachtworth-app/app/` — Expo Router screens
  - `(tabs)/` — Home, Tools, My Yacht, PDYE, Profile (5-tab bottom nav)
  - `(auth)/sign-in.tsx` + `sign-up.tsx`
  - `charter.tsx` + `history.tsx` + `charter-planner.tsx` + `charter-form.tsx` + `client-detail.tsx` — stack routes
  - `valuation/new.tsx` + `result.tsx` — yacht **estimate** wizard
  - `roi/yacht-form.tsx` + `calculate.tsx` + `result.tsx` — Charter ROI
  - `cost/new.tsx` + `result.tsx` — Annual cost
  - `my-yacht/edit.tsx` + `[id].tsx` — yacht profile (T009)
  - `settings.tsx`
- `artifacts/yachtworth-app/components/` — `YachtCard`, `CompletenessBar`, `ComingSoonModal`, …
- `artifacts/yachtworth-app/hooks/useUnits.ts` (AsyncStorage `yachtworth.units`)
- `artifacts/yachtworth-app/lib/` — `charterCalc.ts`, `charterExports.ts`, `yachtCompleteness.ts`, `pdf.ts`
- `artifacts/api-server/src/`
  - `routes/{valuations,estimates,yachts,roi,costEstimates,charters,clients}.ts`
  - `lib/{valuation,roi,cost-estimate}/` — engines
  - `lib/supabase.ts` (lazy singleton + table constants)
  - `middlewares/clerkAuth.ts` (`softClerkAuth` + `requireAuth`)
  - `lib/validators.ts` (`isUuid` guard)
- `lib/api-spec/openapi.yaml` — single source of truth → orval generates hooks + zod
- `migrations/` — Supabase SQL (owner runs manually in SQL editor)

## DB migrations — owner-run order

Run sequentially in Supabase SQL editor of `yachtworth-prod`:

1. `001_estimates.sql` — yacht estimates persistence
2. `002_charter_roi.sql` — yachts + roi_calculations + market_rates + expense_rates
3. `003_yacht_expenses.sql` — 14 expense fields on yachts (8 monthly + 5 annual + commission %)
4. `004_crew_breakdown.sql` — `yachts.crew_breakdown jsonb`
5. `005_seed_rates.sql` — market_rates (54) + expense_rates (32) + RPC `get_roi_rates`. Idempotent.
6. `007_cost_estimates.sql` — cost_estimates table
7. `008_charter_planner.sql` — charters + clients tables; adds `photo_url`+`notes` to yachts
8. `009_charter_planner_full.sql` — 35+ charter fields (APA, distribution jsonb, expanded crew, NOT NULL numerics)
9. `010_central_agent_subagents.sql` — central_agent + sub_agents jsonb on charters
10. `011_yacht_profile.sql` — yacht profile fields + `is_archived` (T009)
11. `012_yacht_equipment.sql` — `yacht_equipment` table (~60 items across 8 categories, one row per logical unit; cascade-delete from yachts)

Until each is run, the corresponding feature degrades (POSTs no-op warn-logged, GETs empty/401, engines fall back to heuristics).

## Build status

### Current — T-Equipment My Yacht Section 8 (May 28, 2026 — IN REVIEW)
Per `attached_assets/2026-05-28_Replit_Prompt_MyYacht_Equipment_*.pdf`. Adds ~60-item Equipment & Systems section to Add/Edit Yacht form, persisted to a separate `yacht_equipment` table (one row per logical unit).
- **migration 012:** `yacht_equipment` table with category CHECK (`power|water|navigation|safety|comfort|toys|deck|sailing`), 19 spec columns (brand, model, serial, year_installed, power_kw/hp, hours, capacity_liters, capacity_persons, panels_count, total_watts, zones_count, type_detail, notes, quantity), RLS deny_all, FK cascade-delete from yachts, indexes on yacht_id + clerk_user_id.
- **OpenAPI:** new schemas `EquipmentCategory`/`EquipmentItem`/`EquipmentList`; routes `GET`+`PUT /yachts/{id}/equipment` (PUT = replace-all atomically). Codegen passed.
- **Backend (`routes/yachts.ts`):** ownership pre-check, delete-then-insert PUT, strips client `id`. `YACHT_EQUIPMENT_TABLE` const in `supabase.ts`.
- **Frontend:**
  - `lib/equipmentConfig.ts` — declarative 7-group catalog (~60 items) + sailing group gated by yacht_type + `summarizeEquipment` helper for overview rendering.
  - `components/EquipmentSection.tsx` — collapsible groups; `ToggleRow` (on/off → single row presence) + `MultiRow` (generators/tenders/jetskis with Add/Remove + maxUnits cap); `FieldInput` supports text/number/integer/select-as-pills/stepper with proper keyboard types.
  - `app/my-yacht/edit.tsx` — Section 8 added; equipment loaded via `useListYachtEquipment`, saved after yacht PATCH/CREATE via `useReplaceYachtEquipment`, cache invalidated by yacht-id-scoped key.
  - `app/my-yacht/[id].tsx` — Overview gains "Equipment & Systems" read-only block (catalog-order grouping, multi-units shown as "N units · summary / summary").
  - `lib/yachtCompleteness.ts` — `calcEquipmentBonus` (+3 gen, +5 raft+EPIRB, +3 nav, +2 tender); `calcCompleteness(yacht, equipment?)` additive cap 100 — yachts without equipment data not penalised.
- Equipment never flows into Charter Planner / Valuation / ROI / Cost. Owner runs migration 012 manually before feature works (GET 404 / PUT 503 until then — yacht form still saves).

### T009 My Yacht Foundation Layer (May 28, 2026 — DONE)
Per `attached_assets/2026-05-28_Replit_Prompt_MyYacht_Foundation_*.pdf`. Central yacht profile hub that all tools link to. Existing tools (Valuation/Cost/ROI/Charter Planner) **untouched**.
- **migration 011:** adds `draft_meters`, `registration_number`, `imo_number`, `hull_id`, `vat_status` (`tax_paid_eu|tax_not_paid|unknown`), `engine_maker`, `engine_model`, `engine_count`, `total_hp`, `crew_cabins`, `berths`, `heads`, `owner_role` (`owner|broker|manager`), `is_archived`. CHECK constraints. Partial index on `(clerk_user_id) where is_archived=false`. Reuses `brand`(=builder), `length_meters`, `beam_meters`, `cabins`(=guest_cabins), `engine_hours`, `home_port`, `photo_url`, `notes`.
- **OpenAPI:** new enums `YachtVatStatus` (renamed to avoid collision with valuations `VatStatus`) + `YachtOwnerRole`. `Yacht`+`YachtInput` extended. List endpoint accepts `?include_archived=true|1` (default hides archived).
- **`lib/yachtCompleteness.ts`:** `calcCompleteness`/`nextSuggestedField`/`missingFields`. Stepper-numeric `0` counts as missing.
- **`app/my-yacht/edit.tsx`:** 7 collapsible sections, sticky save bar, units snapshotted at mount for ft↔m, IMO 7-digit numeric filter, validation name/type/year/length. Stepper integers round-trip as-is (incl. 0).
- **`components/YachtCard.tsx` + `CompletenessBar.tsx`:** photo or anchor fallback, edit pill, flag/port, completeness bar w/ hint, 2×2 actions (Valuations/Costs/Charters/Passport[SOON]), archived badge.
- **`app/(tabs)/my-yacht.tsx`:** always fetches `include_archived=true`; bottom-up segments active vs archived. "Show archived (N)" toggle reachable even when active list empty. Empty state: gold anchor + "+ Add my first yacht".
- **`app/my-yacht/[id].tsx`:** Overview/History/Documents tabs + overflow menu (Edit/Archive/Delete). History = charters filtered by `yacht_id`. Cache invalidation by `["/api/yachts"]` prefix covers both list variants.
- **API:** PATCH+DELETE `/yachts/:id` already existed; `is_archived` filter added in T009.1.

### Historical milestones (DONE — collapsed)

- **Days 1–5 (Core estimates):** Expo skeleton + design system + tabs; Clerk auth (Apple+Google+email) via `ClerkProvider` + `ClerkTokenBridge` → `setAuthTokenGetter`; 5-step estimate wizard w/ mode toggle (builder/specs) + units toggle (metric/imperial, API contract metric-only); user-facing rename valuation → "estimate" (code names preserved); PDF export (`expo-print`+`expo-sharing`); Supabase persistence; History tab; Profile + Settings (units, About, Powered by PDYE). RevenueCat/paywall/App Store submit deferred.
- **Phase 2 — Charter ROI Intelligence:** schema + OpenAPI + CRUD `/yachts` + `/roi/calculate` w/ 3 pricing modes (manual_daily/manual_weekly/ai). AI mode → web_search comparables. Engine: loan annuity, depreciation (5y, monthly seasonal Med weights), expenses (owner overrides → fallback), revenue (AI → AI chat → heuristic, never 500s). Data-driven baseline via `migrations/005_seed_rates.sql` + `lib/roi/rates.ts` (RPC `get_roi_rates`). Full expense questionnaire (8 monthly + 5 annual + commission %) + crew_breakdown jsonb (6 positions × salary × months_per_year). Empty fields → `null` = fall back to regional avg.
- **Annual Cost Estimator (Stages A1–A4):** pure deterministic calculator (no AI). `/cost-estimates` POST (soft auth — guest calc, signed-in save) + GET list/detail + DELETE. 4-step wizard + minimal results. 8 annual maintenance fields + crew months_per_year stepper. History tab extended w/ 3-segment switch (Estimates/Cost/ROI). Delete-from-history w/ Swipeable + concurrent-safe `pendingIds` set.
- **Navigation restructure:** 5-tab bottom nav (Home/Tools/My Yacht/PDYE/Profile), NativeTabs (SF symbols) + Classic fallback (Feather). Charter & History out of (tabs) → root Stack screens w/ back-FAB. Home: hero + 2×2 role grid (persists `yachtworth.tools.role`) + quick actions. Tools tab: 12 cards (3 LIVE + 9 SOON), role chip filter, SOON tap → ComingSoonModal. PDYE tab: gold CTA → opens pdyegroup.com via `expo-web-browser`. ComingSoonModal: BlurView + gold-bordered card + notify-me list (AsyncStorage `yachtworth.coming_soon_notify`).
- **Charter Planner (Phase 3):** Tools card → `/charter-planner` (3-tab top bar: Fleet/Calendar/Clients). `migrations/008` adds charters + clients tables. Fleet: yacht cards w/ today-status dot. Charter Form (`app/charter-form.tsx`): 7 sections, sticky bottom bar, live P&L card, DateTimePicker. Calendar: `GanttGrid` (sticky yacht column + scrollable day cells, today highlight). Clients: list + `app/client-detail.tsx`. Exports (`lib/charterExports.ts`, `expo-file-system@~19.0.22` pinned to SDK 54): per-charter PDF + monthly fleet PDF + CSV (Excel-compatible). Architect-fixed: date timezone drift (YYYY-MM-DD as plain string), CSV formula injection (prefix-escape `=+-@\t\r`), web fallback explicit error.
- **Charter Planner Full Update (May 2026):** `migrations/009` adds 35+ fields (APA pass-through fund, contract status, transfer/refund/damage/extras, expanded crew, `distribution jsonb`). `lib/charterCalc.ts` (pure, shared form↔exports): VAT added ON TOP, APA never enters P&L net_profit (only damage if owner-paid), UTC-parsed date math, `DEFAULT_DISTRIBUTION = 80/10/10`. Charter-form rewritten to 11 sections w/ reusable DateField+Stepper. Server-side `normalizeCharterPayload()` coerces `null`→`0` for 19 NOT NULL numeric columns.
- **Charter Planner Corrections (May 28, 2026):** `migrations/010` adds `central_agent_{name,type,value}` + `sub_agents jsonb` (max 3). `charterCalc` rewritten: boat owner = base_net − central − subs − custom distribution (implicit residual). Form Section 9 rebuilt (central agent + sub-agents w/ live preview + custom participants). New helpers: `TimeInput` (HH:MM clamped), `EuroField` (€ suffix). APA summary lists non-zero rows only. PDF P&L + CSV header rebuilt accordingly.

## Not in v1.0

Push notifications, multi-language, corporate accounts, yacht photo upload, marketing site. All v1.1+.

## Deferred (not approved by owner)

- V2 spec point 2: per-comparable freshness badges (`fresh/verify/stale`) — revisit after real-world stale-listing complaints
- V2: broker tier, GDPR copy, free-tier hard limit on backend
- Architect hardening: DB-level CHECK constraints (`>=0`, commission `[0,100]`), upper bounds on `numeric(12,2)` to prevent overflow, unit test for ROI no-hit rounding invariant
- A11y backfill on `cost/new` Step 2 crew toggles/steppers + Step 1–4 pills
- Estimates/cost-estimates link to `yacht_id` (T009 History tab currently shows charters only)

## Run

- `pnpm --filter @workspace/yachtworth-app run dev` — Expo (workflow `artifacts/yachtworth-app: expo`)
- `pnpm --filter @workspace/api-server run dev` — Express (workflow `artifacts/api-server: API Server`, port 5000, served at `/api`)
- `pnpm run typecheck` — full monorepo typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regen hooks + zod from openapi.yaml

## Architecture decisions

- One shared backend (`api-server`) for both web and mobile, not a separate `yachtworth-api`.
- Supabase is primary DB; Drizzle schemas in `lib/db/` mirror Supabase tables.
- Brand navy/gold hard-referenced in screen files (not via `useColors()`) — luxury identity must render dark regardless of system theme.
- API contract is **metric-only** (golden rule). Units conversion happens in UI; form-level `formUnits` is snapshotted at mount to prevent 3.28× corruption when user toggles Settings mid-form.
- AI paths always have deterministic fallback → engine never returns 500 because of AI.
- Soft auth on guest-friendly endpoints (`/valuations`, `/cost-estimates` POST): calc always returned; persistence only if signed in.

## User preferences

- Russian conversation with owner, simple words, no jargon
- **App UI must be in English** (international audience)
- Owner is non-technical
- Do not re-ask questions already answered in this file
- Brand visual: deep navy `#0B1E3F` + champagne gold `#C9A961`, Gilroy + Inter

## Required secrets

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `YACHTWORTH_OPENAI_API_KEY` (optional — falls back to Replit AI proxy)
- `CLERK_SECRET_KEY` (backend), `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (frontend)
- RevenueCat keys (Day 6, deferred)

## Pointers

- `expo` skill — mobile dev guidelines
- `pnpm-workspace` skill — workspace structure
- `attached_assets/` — original PDYE spec docs (questionnaire, prompt spec, units toggle spec, T009 PDF, charter PDFs)
