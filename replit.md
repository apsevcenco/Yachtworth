# Yachtworth

Standalone luxury mobile app (iOS + Android) for AI-powered yacht valuation. Created by the team behind PDYE, but a separate brand.

## Product

- **Audience:** yacht owners + brokers/surveyors
- **Core flow:** user enters yacht parameters (length, year, shipyard, condition, etc.) → AI returns valuation with price range + chart + PDF report
- **Branding:** luxury minimalism — deep navy `#0B1E3F` + champagne gold `#C9A961`. Fonts: **Gilroy** (headings, owner-provided .otf in `assets/fonts/` — `Gilroy-Regular` + `Gilroy-ExtraBold`) + Inter (body)
- **Cross-link with PDYE:** clean Yachtworth logo, but inside the app:
  - Onboarding: "by the team behind PDYE"
  - Settings/About: "Powered by PDYE" block
  - For valuations > €5M or quick-sale: banner suggesting PDYE for broker support

## Monetization

- Free: 1 valuation/month, no history
- Basic: €19.99/month
- Pro: €49.99/month (history, PDF export, unlimited valuations)
- 7-day free trial

## Stack

- **Frontend:** Expo React Native (artifact `yachtworth-app`, served at `/`) — single codebase for iOS + Android
- **Backend:** shared `api-server` artifact (Express 5, served at `/api`) — used instead of a duplicate `yachtworth-api` because the monorepo's standard pattern is one shared backend per workspace
- **DB (planned):** Supabase project `yachtworth-prod` (Frankfurt region) — owner-provisioned
- **Auth (planned):** Clerk — Apple Sign-In (App Store requirement) + Google + Email
- **Subscriptions (planned):** RevenueCat
- **AI valuation (planned):** OpenAI via existing PDYE-style logic (base price by length/year/shipyard/condition + multipliers: New 1.05 / Excellent 1.00 / Good 0.93 / Fair 0.83 / Needs Refit 0.70 / Project 0.50, distressed -20%, quick-sale -30%)
- **Deployment:** Render (separate service from existing PDYE)

## 7-day Build Plan

- **Day 1 (current):** App skeleton + design system + tabs (Home / History / Profile) + DB schema (users, valuations, subscriptions)
- **Day 2 (current):** Clerk auth — DONE. ClerkProvider in `app/_layout.tsx` (tokenCache via expo-secure-store). `app/(auth)/sign-in.tsx` + `sign-up.tsx` with Email+Password (email verification code), Apple SSO (`oauth_apple`), Google SSO (`oauth_google`) — all branded navy/gold. Profile tab shows real `useUser()` + Sign out when signed-in, "Sign in" CTA when guest. Tabs stay public (per skill — no gate on landing). `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` wired in dev script and `scripts/build.js` for prod.
- **Day 3 (current): Valuation form + AI engine + result screen — DONE (re-spec'd Day 3.5).**
  - **Day 3.5 — full PDYE questionnaire ported.** Form rebuilt as 5-step wizard (`General → Market → Hull → Engines → Capacity`) per `attached_assets/Pasted-Yachtworth-Valuation-Questionnaire-full-specification...txt`. Mode toggle (`builder` vs `specs`), units toggle (m/ft + t/lt — converts on flip without losing data), per-step inline validation, "I don't have all the data" bypass. Backend extended: new fields `mode`, `bypass_required`, `refit_year`, `sale_region` (5 enum), `vat_status` (conditional on region), `draft_meters`, `displacement_tonnes`, `gross_tonnage`, `engine_maker/model/config/count`, `horse_power`, `range_nm`, `cabins/heads/berths/crew`. Region guidance string injected into prompt. Bypass caps confidence at medium and uses Excellent (1.00) multiplier when condition missing. Completeness weights matched to spec (mode-aware: builder/model excluded in specs mode). Result extended with `sale_region_label`, `vat_status`, `condition_label`, `completeness_filled/total/missing_critical`, `sanity_per_meter_eur`. Sanity-fallback heuristic cleaned up.
  - Backend `POST /api/valuations` (api-server). Engine adapts production PDYE logic: `lib/valuation/{index,sanity,condition,openai,completeness}.ts`. OpenAI `gpt-5-mini` via Responses API + `web_search_preview` tool, with `/chat/completions` fallback. **Prompt fully ported from PDYE spec (`attached_assets/Pasted-Yachtworth-OpenAI-Prompt-Specification...txt`)**: full STEP 1–4 structure, BLOCK 3 region as HARD FILTER (with region-specific search query examples), BLOCK 4 VAT cohort filter (structurally different markets — NOT a percentage adjustment, with EU brokerage indicators), BLOCK 5 completeness with FILLED/TOTAL line, BLOCK 6 mode note (builder = factor brand premium / specs = pure tech), OPEN MARKET LISTING EQUIVALENT critical block (asking-price equivalent, weighted avg of comps, NO asking→sold haircut), explicit "PRICE AS EXCELLENT" instruction. Mobile adaptations per spec TL;DR: **3 comparables (not 5)**, **2 sentences max reasoning**. Separate `buildFallbackPrompt()` for chat-completions path; fallback also caps confidence to low (no web search → training-data only). Sanity check by €/m bands per yacht type+configuration, with premium overrides for ≥18–20m. Condition multipliers New 1.05 / Excellent 1.0 / Good 0.93 / Fair 0.83 / Needs Refit 0.7 / Project 0.5 (deterministic, server-authoritative — AI is told to price as Excellent). Distressed = −20%, Quick-sale = −30%. Confidence floor by completeness score (<30 → low, <50 → medium, etc.). API key resolution: prefers user's `YACHTWORTH_OPENAI_API_KEY` (real OpenAI), falls back to Replit AI Integrations proxy.
  - Frontend `app/valuation/new.tsx`: form (4 yacht-type pills, 6 condition pills, length, year, shipyard, model, configuration, engines HP, beam, hull material, notes). Required: type, length (1–200m), year (1900–2100), condition. Inline error borders.
  - Frontend `app/valuation/result.tsx`: hero estimated price + range, confidence chip, sanity-adjusted notice, condition adjustment line, 3-tier bar chart (Open market / Discreet / Quick), AI reasoning, comparables list, "Powered by PDYE" block, "New valuation" CTA. Data passed via `expo-router` params as JSON.
  - `app/_layout.tsx` calls `setBaseUrl(`https://${EXPO_PUBLIC_DOMAIN}`)` from `@workspace/api-client-react` so the Expo bundle hits the proxy at the same Replit dev domain.
  - Home tab CTA wired to `router.push("/valuation/new")`.
  - **Skipped from PDYE for v1 mobile** (defer to later): internal comparables DB lookup (`findComparables`), region/VAT cohort filters, `valuation_requests` jsonb log table, IP rate limiting middleware. The `valuations` table in `lib/db/` exists but persistence will be wired on Day 5 when history UX lands.
- **Day 4:** PDF report export + history persistence to Supabase
- **Day 5:** History + Profile + Settings with "Powered by PDYE"
- **Day 6:** RevenueCat + paywall + 7-day trial + free-tier limits
- **Day 7:** Screenshots + App Store/Google Play descriptions + Privacy Policy + Terms + EAS Build

## Not in v1.0

Push notifications, multi-language, corporate accounts, yacht photo upload, marketing site. All v1.1+.

## Run & Operate

- `pnpm --filter @workspace/yachtworth-app run dev` — Expo dev server (Replit workflow `artifacts/yachtworth-app: expo`)
- `pnpm --filter @workspace/api-server run dev` — Express API server (port 5000, served at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod schemas from OpenAPI spec

## Where things live

- `artifacts/yachtworth-app/` — Expo mobile app (frontend)
  - `app/(tabs)/` — Home, History, Profile
  - `constants/colors.ts` — brand palette (navy + gold, light + dark)
  - `app.json` — splash background `#0B1E3F`
- `artifacts/api-server/` — shared Express backend (will hold valuation AI + Clerk webhooks + Supabase calls)
- `lib/api-spec/openapi.yaml` — single source of truth for the API contract
- `lib/db/` — Drizzle schemas (will mirror Supabase tables)

## Architecture decisions

- One shared backend (`api-server`) for both web and mobile, not a separate `yachtworth-api`. Standard monorepo pattern.
- Supabase is the primary database; Drizzle schemas in `lib/db/` mirror the Supabase tables.
- Brand colors are hard-referenced in screen files (not just `useColors()`) where the design always renders dark navy regardless of system theme — luxury identity must be consistent.

## User preferences

- Russian-language conversation with the owner, simple words, no jargon
- **App UI must be in English** (not Russian) — owner serves international yacht owners and brokers
- Owner is non-technical
- Do not re-ask questions already answered in the original briefing — full context is in this file
- Brand visual: deep navy `#0B1E3F` + champagne gold `#C9A961`, Playfair Display + Inter

## Required secrets (will be requested per stage)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Day 1, schema)
- `OPENAI_API_KEY` (Days 3–4, AI valuation)
- Clerk keys (Day 2)
- RevenueCat keys (Day 6)

## Pointers

- See the `expo` skill for mobile dev guidelines
- See the `pnpm-workspace` skill for workspace structure
