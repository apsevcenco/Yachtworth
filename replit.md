# Yachtworth

Standalone luxury mobile app (iOS + Android) — AI-powered yacht **estimates** + Charter ROI + Annual Cost calculator. Spinoff from PDYE; separate brand, shared backend.

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
  - `charter.tsx` + `history.tsx` — stack routes (out of tabs since restructure)
  - `valuation/new.tsx` + `result.tsx` — yacht **estimate** wizard
  - `roi/yacht-form.tsx` + `calculate.tsx` + `result.tsx` — Charter ROI
  - `cost/new.tsx` + `result.tsx` — Annual cost
  - `settings.tsx`
  - `hooks/useUnits.ts` (AsyncStorage key `yachtworth.units`)
  - `components/ComingSoonModal.tsx` — reusable modal for SOON tools (AsyncStorage `yachtworth.coming_soon_notify`)
- `artifacts/api-server/src/`
  - `routes/{valuations,estimates,yachts,roi,costEstimates}.ts`
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
5. `005_seed_rates.sql` — seeds market_rates (54 rows) + expense_rates (32 rows) + RPC `get_roi_rates`. Idempotent.
6. `007_cost_estimates.sql` — cost_estimates table

Until each is run, the corresponding feature degrades: POSTs silently no-op (warn-logged), GETs return empty/401, ROI engine falls back to heuristics.

## Build status

### Core estimates flow (Days 1–5) — DONE
- Day 1: app skeleton + design system + tabs
- Day 2: Clerk auth (Apple+Google+email) — `ClerkProvider` + `ClerkTokenBridge` → `setAuthTokenGetter` for api-client-react
- Day 3+3.5: yacht **estimate** wizard (5-step: General / Market / Hull / Engines / Capacity), mode toggle (builder/specs), units toggle (metric/imperial — persisted globally, **API contract metric-only**)
- Day 3.6: user-facing rename valuation → "estimate" (code names preserved for contract stability); legal disclaimer wired
- Day 4: PDF export (`expo-print` + `expo-sharing`, helpers in `lib/pdf.ts`); Supabase persistence; History tab
- Day 5: Profile + Settings (units toggle, About, Powered by PDYE card)
- Day 6/7 (RevenueCat + paywall + App Store submit): **DEFERRED** by owner — Phase 2 prioritized first

### Phase 2 — Charter ROI Intelligence (in progress, Pro-gate deferred to Day 6)
- **Stage 1:** schema + OpenAPI + CRUD `/yachts` + stub `/roi/calculate`
- **Stage 2:** Charter tab + yacht-form wizard (3 steps initially), one active yacht per user on v1 (newest by `updated_at`)
- **Stage 2.5:** full expense questionnaire added to yacht form (Step 3: 8 monthly + 5 annual + commission %); form grew to 4 steps. Empty fields → `null` = "fall back to regional avg", not 0
- **Stage 2.6:** crew_breakdown — 6 positions (Captain / 1st Officer / Engineer / Chef / Stewardess / Deckhand), salary + months_per_year (1-12) per position. Submits both `crew_breakdown` jsonb AND legacy `monthly_crew_eur` aggregate for engine compat. Ghost-button restyle across all CTAs (transparent + gold border + gold text).
- **Stage 3:** real `/roi/calculate` — 3 pricing modes (manual_daily / manual_weekly / ai). AI mode → web_search comparables → midpoint rate. Engine in `lib/roi/`: loan annuity, depreciation (-5%/-3.5% step, 5y projection w/ 3% inflation, monthly seasonal Med weights), expenses (owner overrides → fallback heuristics), revenue (AI Responses → AI chat → deterministic heuristic — never 500s). Result: ROI%, payback, risk_score, recommendations, charts.
- **Stage 4:** data-driven baseline via `migrations/005_seed_rates.sql` + `lib/roi/rates.ts`. Single round-trip via RPC `get_roi_rates(yachtType, region)`. Heuristic fallback when seed missing — zero regression.

### Navigation restructure (current — DONE)
Restructured per PDF spec while keeping all existing screens & flows. Brand unchanged (#0B1E3F + #C9A961).
- **5-tab bottom nav** (was 4): Home / Tools / My Yacht / PDYE / Profile. NativeTabs (SF symbols: house / wrench.and.screwdriver / sailboat / lock.shield / person) + Classic fallback (Feather: home / tool / anchor / shield / user). PDYE gets gold tint when focused.
- **Charter & History moved out of (tabs)** → root Stack screens (`app/charter.tsx`, `app/history.tsx`), `presentation: "card"`, with floating back-FAB (40×40 navy-tinted circle, top-left) to return to /tools (charter) or /profile (history).
- **Home rewritten** — hero "Your yacht. Fully understood." + 2×2 role grid (Owner/Broker/Charter/Surveyor → sets `yachtworth.tools.role` in AsyncStorage AND pushes `/(tabs)/tools?role=X`) + 2 quick actions (New Valuation / My Yacht) + featured banner → /valuation/new.
- **Tools tab (new)** — 12 cards (3 LIVE: AI Valuation, Annual Cost, Charter ROI; 9 SOON: Listing Generator, Yacht Verification, Digital Passport, Survey Builder, Maintenance Log, Broker CRM, Charter Planner, Flag Calculator, Marina Database). Role chip filter (All/Owner/Broker/Charter/Surveyor) persisted to `yachtworth.tools.role`; param `?role=X` from Home takes priority on mount. SOON tap → `ComingSoonModal`.
- **My Yacht tab (new)** — empty state ("+ Add my yacht" → /roi/yacht-form) OR active yacht card (newest by `updated_at` from `useListYachts`) + 3 action rows: View Valuation (/valuation/new), View Cost Estimate (/cost/new), Digital Passport (SOON — opens modal). If >1 yacht: "Manage all N yachts" → /charter.
- **PDYE tab (new)** — hero ("Off-market yacht transactions") with full-width gold CTA → opens pdyegroup.com via `expo-web-browser` + 3 info cards (NDA Protected / Deal Room / Success Fee Only) + bottom Register CTA.
- **Profile** — added "My valuations history" row → /history (signed-in only) above Settings. Rest unchanged.
- **ComingSoonModal** — BlurView backdrop + gold-bordered card with tool icon/title/desc + "Notify me when ready" (persists tool key to `yachtworth.coming_soon_notify` list, shows "We'll let you know" then auto-closes after 1.1s) + Close.

### Charter Planner Corrections (May 28, 2026 — DONE)
Per `attached_assets/2026-05-28_Replit_Prompt_CharterFixes_*.pdf`. 4 corrections on top of May 2026 full update.
- **migration 010 (`migrations/010_central_agent_subagents.sql`):** owner-run. Adds `central_agent_name`, `central_agent_type` (`percent_net|fixed`), `central_agent_value numeric(12,2)` (default 10), `sub_agents jsonb` (default `[]`). Backfill strips owner/agent/aa rows from existing `distribution` to free residual for boat owner (idempotent). CHECK on `central_agent_type`.
- **`lib/charterCalc.ts` (fully rewritten):** new `CentralAgentType`, `SubAgentType`, `SubAgent`, `MAX_SUB_AGENTS=3`, `DEFAULT_CENTRAL_AGENT_VALUE=10`. `calcCharter` adds `central_agent_amount`, `sub_agent_results[]`, `sub_agent_total`. Sub-agent types: `percent_net` (of base_net), `percent_central` (of central_agent_amount), `fixed €`. P&L expenses include central + sub-agent commissions. **Boat owner = base_net − central − subs − custom distribution** (implicit residual). `agent_commission` kept as alias = central_agent_amount for back-compat. `aa_commission` removed. `DEFAULT_DISTRIBUTION = []` (no preset 80/10/10 — owner is residual).
- **OpenAPI + backend (`routes/charters.ts`):** Charter/CharterInput add `central_agent_{name,type,value}` + `sub_agents[]`. `CHARTER_COLUMNS` updated, `NOT_NULL_NUMERIC_DEFAULTS.central_agent_value=10`. Codegen ran.
- **`charter-form.tsx`:** Section 9 rebuilt — Central Agent block (name + type pill + value) → Sub-agents list (max 3, each with name/type-pill/value/remove + live amount preview) → optional custom participants (partner/referrer). P&L removes `− AA commission`, adds dynamic central + sub rows. Payout Summary shows central + subs + customs, then "BOAT OWNER RECEIVES" (residual, red if negative). New helpers: `TimeInput` (HH:MM auto-formatted, clamps HH≤23/MM≤59) replaces free-text time Fields; `EuroField` (€ suffix inside input on right) used for all 8 APA spend buckets. APA summary card now lists only **non-zero** spend rows above the spent/balance lines.
- **`lib/charterExports.ts`:** `charterToCalcInput` maps central_agent + sub_agents from Charter. PDF P&L + Income Distribution rebuilt: removed AA + Agent rows, added Central Agent + each sub + each custom participant + "Boat Owner receives" residual. CSV header swapped `AA commission|Agent commission|Owner share` → `Central Agent|Central Agent name|Sub-agents total|Boat Owner receives`.
- **Type-safety:** yachtworth-app + api-server typecheck green.

### Charter Planner Full Update (May 2026 PDF spec — DONE)
Per `attached_assets/2026-05-28_Replit_Prompt_CharterUpdate_Full.pdf`. Refactor of charter math + form + exports to match real broker workflows.
- **migration 009 (`migrations/009_charter_planner_full.sql`):** owner-run. Adds `contact_name`, `contract_status`+`contract_date`, `mooring/pickup/dropoff_port`, `transfer_fee`+`paid_by`+`note`, `departure_time`+`return_time`, `charter_rate_period` (mirrors type), APA block (`apa_enabled`, `apa_percent`, `apa_amount`, 8 spend buckets + 2 notes), `refund_amount`+`reason`, `extra_service_amount`+`note`, `damage_amount`+`paid_by`+`note`, expanded crew (`first_officer_*`, `chef_*`, `deckhand_*`), `distribution jsonb` (array `{name,type,value}`). All numerics `NOT NULL DEFAULT 0`. CHECK constraints on rate type, contract status, transfer/damage paid_by, apa_percent [0,100], deckhand_count >= 0. Backfill: `charter_rate_period := charter_rate_type`.
- **`lib/charterCalc.ts` (pure, shared form ↔ exports):** `calcCharter(input)` → `CharterCalcResult`. **VAT is added ON TOP** of base net (`total_to_client = base_net + vat_amount`). APA is a **pass-through fund** — collected, spent, balanced; NEVER enters P&L `net_profit` (only `damage_absorbed` enters when `damage_paid_by==='owner'`). Distribution amounts computed from `base_net` (not gross). Rate types: `fixed | per_day | per_week`. Date math uses UTC-parsed YYYY-MM-DD (no `new Date(s)` DST drift). `DEFAULT_DISTRIBUTION = 80/10/10` (owner/AA/agent).
- **OpenAPI + backend (`routes/charters.ts`):** Charter/CharterInput extended (35+ new fields). `CHARTER_COLUMNS` updated. New `normalizeCharterPayload()` helper coerces incoming `null` → `0` for 19 NOT NULL numeric columns before insert/update — clients can safely send empty fields without DB errors. Codegen ran.
- **`app/charter-form.tsx` (rewritten, ~2800 lines):** 11 sections (Basics, Logistics, Vessel, Crew, Revenue, APA, Expenses, Extras, Distribution, P&L+Payout, Notes). Reusable `DateField` + `Stepper` subcomponents. Date pickers: iOS Modal + inline spinner / Android native dialog (`@react-native-community/datetimepicker` 8.4.4, pinned). Distribution editor: %/€ toggle per row, add/remove rows, non-blocking warn when sum ≠ base_net. Live P&L card uses `calcCharter`. `fromCharter` uses nullish-safe `!= null` checks (not truthy) so persisted `0` round-trips correctly. `toInput` sends with `numOrNull`; server-side normalize handles NOT NULL coercion.
- **`lib/charterExports.ts` (rewritten):** `charterToCalcInput` mirrors form's `toCalcInput` exactly (incl. distribution fallback to `DEFAULT_DISTRIBUTION` when empty) so PDF/CSV match live form. `computeCharterPnl` returns full `CharterCalcResult` (`CharterPnl` aliased for back-compat). **Per-charter PDF** now includes Client+Contract, Logistics+Transfer, Revenue (base→+VAT→Total to client→+APA→Invoice), APA breakdown card (when enabled, with balance line), expanded Crew (5 positions), Fuel+engine hours, Owner expenses, Extras/Damage/Refund (conditional), P&L (with AA + agent commissions), and Income Distribution (with balanced/over/under indicator). **Fleet PDF** KPIs switched from VAT-inclusive gross to `base_net`/`vat`/`invoice`/`profit`. **CSV** expanded to 35 columns (base_net, vat, total_to_client, APA, transfer, extras, damage, refund, commissions, owner share). Cancelled+blocked still excluded from totals.
- **Type-safety:** all `T | undefined` from codegen on optional Charter fields coerced with sensible defaults at the integration boundary. yachtworth-app + api-server typecheck green.

### Charter Planner (Phase 3 — DONE, pre-May-2026)
Full Fleet/Calendar/Clients module per PDF spec. Tools card "Charter Planner" → `/charter-planner` (3-tab top bar: Fleet / Calendar / Clients). Backend: `migrations/008_charter_planner.sql` adds `photo_url`+`notes` to yachts, creates `charters` + `clients` (RLS deny_all, scoped by `clerk_user_id`). Routes: `/charters` CRUD + `/clients` CRUD with `softClerkAuth+requireAuth`, `isUuid` guards, `{count:'exact'}` 404 on delete.
- **Stage 1–2 (Fleet+skeleton):** yacht cards with today-status dot (active/upcoming/free) + next-charter line; AddYachtSheet reuses existing yachts POST.
- **Stage 3 (Charter Form, `app/charter-form.tsx`):** 7 sections (yacht/dates/client/pricing/extras/expenses/status+notes), sticky bottom bar, **live P&L card** (`calcPL` pure fn — VAT-inclusive extraction, day count, crew/fuel/expenses), DateTimePicker. Save → invalidates `/api/charters` + `/api/clients`.
- **Stage 4 (Calendars):** `GanttGrid` (sticky left yacht column + horizontal scrollable day cells, today highlight, per-yacht status dot); month nav with "Today" jump-pill.
- **Stage 5 (Clients):** ClientsTab (search/list) + `app/client-detail.tsx` (hero + contact + notes + chronological charter history). Charter-form invalidates `["/api/clients"]` on save+delete (architect-flagged cache bug fixed pre-merge). **Deferred:** FK-vs-by-name client linkage (currently strings on charters; FK migration is follow-up).
- **Stage 6 (Exports, `lib/charterExports.ts`):** `expo-print` + `expo-sharing` + `expo-file-system@~19.0.22` (pinned to SDK 54 — v56 incompatible). **Per-charter PDF** from charter-form bottom bar (gold download icon next to delete, edit-mode only) → `exportCharterPdf`. **Monthly fleet PDF** + **CSV (Excel-compatible)** from CalendarTab nav-row gold share button → 3-option Alert (Fleet PDF / CSV / Cancel). `computeCharterPnl` mirrors form `calcPL` for parity; cancelled+blocked excluded from totals (still shown in rows). Architect-fixed: (a) date timezone drift — `YYYY-MM-DD` parsed as plain string (no `new Date(s)`), (b) CSV formula injection — prefix-escape leading `=+-@\t\r`, (c) web fallback — throw clear error when `Sharing.isAvailableAsync()` false instead of silent no-op. **Deferred:** PDF rounds 0 decimals vs form 2 decimals (cosmetic), true XLSX (CSV opens in Excel fine).

### Annual Cost Estimator (separate module, in progress)
- **Stage A1:** backend foundation — pure deterministic calculator (no AI). `/cost-estimates` POST (soft auth — guests get calc, signed-in users get calc + save) + GET list + GET detail + DELETE. Crew rule: `salary × 12 × qty`, `qty>1` only for stewardess/deckhand (server-enforced clamp). Auto-estimate helpers prepared for future "Auto-fill" button.
- **Stage A2:** 4-step wizard (`cost/new.tsx`) + minimal results screen (hero total/yr + per-day/per-week + category cards + 4 breakdown sections). Home tab second CTA wired.
- **Stage A2.5:** 8 new annual maintenance fields (engine / generator / electronics / safety / tender / hull paint / rigging / watermaker), crew `months_per_year` stepper (1-12) for stew/deck, builder+model echo through to result header.
- **Stage A3:** History tab extended with 3-segment switch (Estimates / Cost / ROI). Each segment uses its own list hook with `enabled: signedIn && tab===X`, per-tab empty/error/loading states, per-tab card rendering. Deep-link `?id=` added to `cost/result.tsx` (via `useGetCostEstimate`) and `roi/result.tsx` (via `useGetRoiCalculation`). Region label map covers both `CharterRegion` and `OperationRegion` enums. A11y: `tablist`/`tab` roles on segment, `accessibilityRole`+`accessibilityLabel` on all CTAs and cards.
- **Stage A4 — DONE:** Delete-from-history. New `DELETE /estimates/:id` + `DELETE /roi/calculations/:id` (mirror `DELETE /cost-estimates/:id`): `isUuid` guard → 404, `softClerkAuth+requireAuth`, scoped delete by `clerk_user_id` + `id` with `{count:'exact'}` → 404 if zero, 204 on success (no IDOR leak). UI: each list row wrapped in `Swipeable` (react-native-gesture-handler) with red trash action → `Alert.alert` destructive confirm → mutate → invalidate matching list query key. Concurrent-safe via `pendingIds: Set<string>` (per-row spinner survives rapid multi-delete; architect-flagged single-flight bug fixed pre-merge).

## Not in v1.0

Push notifications, multi-language, corporate accounts, yacht photo upload, marketing site, multi-yacht management. All v1.1+.

## Deferred (not approved by owner)

- V2 spec point 2: per-comparable freshness badges (`fresh/verify/stale`) — cosmetic, revisit after real-world stale-listing complaints
- V2: broker tier, GDPR copy, free-tier hard limit on backend
- Architect hardening notes: DB-level CHECK constraints (`>=0`, commission `[0,100]`), upper bounds on expense fields to prevent `numeric(12,2)` overflow, unit test for ROI no-hit rounding invariant
- A11y backfill on `cost/new` Step 2 crew toggles/steppers + Step 1–4 pills/Continue

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
- `attached_assets/` — original PDYE spec docs (questionnaire, prompt spec, units toggle spec)
