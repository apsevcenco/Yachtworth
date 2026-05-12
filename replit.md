# Yachtworth

Standalone luxury mobile app (iOS + Android) for AI-powered yacht valuation. Created by the team behind PDYE, but a separate brand.

## Product

- **Audience:** yacht owners + brokers/surveyors
- **Core flow:** user enters yacht parameters (length, year, shipyard, condition, etc.) → AI returns valuation with price range + chart + PDF report
- **Branding:** luxury minimalism — deep navy `#0B1E3F` + champagne gold `#C9A961`. Fonts: Playfair Display (display) + Inter (body)
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
- **Day 2:** Clerk auth (Apple + Google + Email)
- **Days 3–4:** Yacht valuation form + AI estimation + result screen (price range / chart / PDF)
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
