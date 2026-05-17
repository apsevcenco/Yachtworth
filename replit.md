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
  - `(tabs)/` — Home, Charter, History, Profile
  - `(auth)/sign-in.tsx` + `sign-up.tsx`
  - `valuation/new.tsx` + `result.tsx` — yacht **estimate** wizard
  - `roi/yacht-form.tsx` + `calculate.tsx` + `result.tsx` — Charter ROI
  - `cost/new.tsx` + `result.tsx` — Annual cost
  - `settings.tsx`
  - `hooks/useUnits.ts` (AsyncStorage key `yachtworth.units`)
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

### Annual Cost Estimator (separate module, in progress)
- **Stage A1:** backend foundation — pure deterministic calculator (no AI). `/cost-estimates` POST (soft auth — guests get calc, signed-in users get calc + save) + GET list + GET detail + DELETE. Crew rule: `salary × 12 × qty`, `qty>1` only for stewardess/deckhand (server-enforced clamp). Auto-estimate helpers prepared for future "Auto-fill" button.
- **Stage A2:** 4-step wizard (`cost/new.tsx`) + minimal results screen (hero total/yr + per-day/per-week + category cards + 4 breakdown sections). Home tab second CTA wired.
- **Stage A2.5:** 8 new annual maintenance fields (engine / generator / electronics / safety / tender / hull paint / rigging / watermaker), crew `months_per_year` stepper (1-12) for stew/deck, builder+model echo through to result header.
- **Stage A3 (current — DONE):** History tab extended with 3-segment switch (Estimates / Cost / ROI). Each segment uses its own list hook with `enabled: signedIn && tab===X`, per-tab empty/error/loading states, per-tab card rendering. Deep-link `?id=` added to `cost/result.tsx` (via `useGetCostEstimate`) and `roi/result.tsx` (via `useGetRoiCalculation`). Region label map covers both `CharterRegion` and `OperationRegion` enums. A11y: `tablist`/`tab` roles on segment, `accessibilityRole`+`accessibilityLabel` on all CTAs and cards.

## Not in v1.0

Push notifications, multi-language, corporate accounts, yacht photo upload, marketing site, multi-yacht management. All v1.1+.

## Deferred (not approved by owner)

- V2 spec point 2: per-comparable freshness badges (`fresh/verify/stale`) — cosmetic, revisit after real-world stale-listing complaints
- V2: broker tier, GDPR copy, free-tier hard limit on backend
- Architect hardening notes: DB-level CHECK constraints (`>=0`, commission `[0,100]`), upper bounds on expense fields to prevent `numeric(12,2)` overflow, unit test for ROI no-hit rounding invariant
- Cost cards: swipe-to-delete via `useDeleteCostEstimate` (hook generated, UI not wired)
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
