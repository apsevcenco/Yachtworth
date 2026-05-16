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
  - **Day 3.5 — full PDYE questionnaire ported.** Form rebuilt as 5-step wizard (`General → Market → Hull → Engines → Capacity`) per `attached_assets/Pasted-Yachtworth-Valuation-Questionnaire-full-specification...txt`. Mode toggle (`builder` vs `specs`), units toggle (m/ft + t/lt — converts on flip without losing data) **persisted globally via `hooks/useUnits.ts` + AsyncStorage key `yachtworth.units`** (per `attached_assets/Pasted-Yachtworth-Metric-Imperial-Units-Toggle-Spec...txt`); conversion helpers in `lib/units.ts`. Result screen now also reads `useUnits()` and converts comparable lengths via `formatComparableLength()` so US/UK users see "94ft" instead of "28.5m". API contract stays metric-only (golden rule); DB column `users.preferred_units` deferred to Day 4 with the rest of the schema. Settings-screen toggle deferred to Day 5 — header pill in form is the current entry point. per-step inline validation, "I don't have all the data" bypass. Backend extended: new fields `mode`, `bypass_required`, `refit_year`, `sale_region` (5 enum), `vat_status` (conditional on region), `draft_meters`, `displacement_tonnes`, `gross_tonnage`, `engine_maker/model/config/count`, `horse_power`, `range_nm`, `cabins/heads/berths/crew`. Region guidance string injected into prompt. Bypass caps confidence at medium and uses Excellent (1.00) multiplier when condition missing. Completeness weights matched to spec (mode-aware: builder/model excluded in specs mode). Result extended with `sale_region_label`, `vat_status`, `condition_label`, `completeness_filled/total/missing_critical`, `sanity_per_meter_eur`. Sanity-fallback heuristic cleaned up.
  - Backend `POST /api/valuations` (api-server). Engine adapts production PDYE logic: `lib/valuation/{index,sanity,condition,openai,completeness}.ts`. OpenAI `gpt-5-mini` via Responses API + `web_search_preview` tool, with `/chat/completions` fallback. **Prompt fully ported from PDYE spec (`attached_assets/Pasted-Yachtworth-OpenAI-Prompt-Specification...txt`)**: full STEP 1–4 structure, BLOCK 3 region as HARD FILTER (with region-specific search query examples), BLOCK 4 VAT cohort filter (structurally different markets — NOT a percentage adjustment, with EU brokerage indicators), BLOCK 5 completeness with FILLED/TOTAL line, BLOCK 6 mode note (builder = factor brand premium / specs = pure tech), OPEN MARKET LISTING EQUIVALENT critical block (asking-price equivalent, weighted avg of comps, NO asking→sold haircut), explicit "PRICE AS EXCELLENT" instruction. Mobile adaptations per spec TL;DR: **3 comparables (not 5)**, **2 sentences max reasoning**. Separate `buildFallbackPrompt()` for chat-completions path; fallback also caps confidence to low (no web search → training-data only). Sanity check by €/m bands per yacht type+configuration, with premium overrides for ≥18–20m. Condition multipliers New 1.05 / Excellent 1.0 / Good 0.93 / Fair 0.83 / Needs Refit 0.7 / Project 0.5 (deterministic, server-authoritative — AI is told to price as Excellent). Distressed = −20%, Quick-sale = −30%. Confidence floor by completeness score (<30 → low, <50 → medium, etc.). API key resolution: prefers user's `YACHTWORTH_OPENAI_API_KEY` (real OpenAI), falls back to Replit AI Integrations proxy.
  - Frontend `app/valuation/new.tsx`: form (4 yacht-type pills, 6 condition pills, length, year, shipyard, model, configuration, engines HP, beam, hull material, notes). Required: type, length (1–200m), year (1900–2100), condition. Inline error borders.
  - Frontend `app/valuation/result.tsx`: hero estimated price + range, confidence chip, sanity-adjusted notice, condition adjustment line, 3-tier bar chart (Open market / Discreet / Quick), AI reasoning, comparables list, "Powered by PDYE" block, "New valuation" CTA. Data passed via `expo-router` params as JSON.
  - `app/_layout.tsx` calls `setBaseUrl(`https://${EXPO_PUBLIC_DOMAIN}`)` from `@workspace/api-client-react` so the Expo bundle hits the proxy at the same Replit dev domain.
  - Home tab CTA wired to `router.push("/valuation/new")`.
  - **Skipped from PDYE for v1 mobile** (defer to later): internal comparables DB lookup (`findComparables`), region/VAT cohort filters, `valuation_requests` jsonb log table, IP rate limiting middleware. The `valuations` table in `lib/db/` exists but persistence will be wired on Day 5 when history UX lands.
- **Day 3.6 (current) — V2 spec point 1 DONE: terminology + legal disclaimer.**
  - **User-facing rename "valuation" → "estimate"** in all screens (home, auth, history, profile, new, result) and AI prompt strings ("market analyst" not "appraiser"; explicit instruction to AI not to use "valuation/appraisal/fair market value" in reasoning). **Code-level names PRESERVED** (no contract breakage): file paths, routes `/valuation/new|result`, `POST /api/valuations`, OpenAPI operationId `createValuation`, schema name `Valuation`, types `ValuationRequest/Result/Mode`, `useCreateValuation` hook, `lib/valuation/` folder.
  - **Legal disclaimer** server-injected: `LEGAL_DISCLAIMER` constant in `artifacts/api-server/src/lib/valuation/index.ts` ("This is an indicative market estimate for informational purposes only — not a certified appraisal or valuation. Not suitable for financing, insurance, or legal proceedings. For a certified appraisal, consult a licensed marine surveyor. Estimate valid for 30 days."). Wired through OpenAPI (`legal_disclaimer: string`, required) → server zod-validates response → UI renders verbatim at bottom of result screen (`styles.disclaimer`: 11px, muted, centered).
  - Architect re-review: PASS, no critical issues. Typecheck green, api-server healthy.
- **Day 3.7 — V2 spec DEFERRED items (decided NOT to do now):**
  - **Point 2 (per-comparable freshness badge `fresh/verify/stale`)** — DEFERRED. Owner asked, explained: pure cosmetic (AI guesses freshness from snippet without reliable date data, doesn't actually filter stale comps from calc, legal cover already done by disclaimer). Revisit after Day 4-5 if owner sees stale-listing problem in real tests. If doing later, do MINIMAL version (UI badge only, ~1h) — NOT the full `assessListingFreshness` regex helper from spec (priceHistory array doesn't exist in web_search response).
  - Other V2 items also deferred (not approved by owner): broker tier, GDPR copy, free-tier hard limit on backend.
- **Day 4 (current) — DONE:** PDF report export + history persistence to Supabase + History tab UI.
  - **PDF export**: `expo-print` + `expo-sharing`. `artifacts/yachtworth-app/lib/pdf.ts` (`buildEstimatePdfHtml` + `exportEstimatePdf`), gold "Export PDF report" CTA on result screen with ActivityIndicator. `header` param wired from `new.tsx` via `expo-router` params (yachtType/builder/model/yearBuilt/lengthMeters; meters parsed from m/ft form input).
  - **Backend persistence**: `@supabase/supabase-js` + `@clerk/express` on api-server. `lib/supabase.ts` (lazy singleton, `ESTIMATES_TABLE` const), `middlewares/clerkAuth.ts` (`softClerkAuth` + `requireAuth`; backend gates on `CLERK_SECRET_KEY` only — publishable is frontend), `routes/estimates.ts` (GET /estimates list + GET /estimates/:id detail, both `requireAuth`, scoped by `clerk_user_id` to prevent IDOR). `routes/valuations.ts` extended with `softClerkAuth` and conditional Supabase insert when `req.userId` exists; returns `id` in response so client can deep-link. **Persistence is OPTIONAL — guests still get an estimate, just not saved.**
  - **OpenAPI**: added `id?` to `Valuation`, new `EstimateListItem`/`EstimateListResponse`/`EstimateDetail` schemas, `bearerAuth` securityScheme, `estimates` tag, GET /estimates + /estimates/{id} endpoints. Hooks generated: `useListEstimates`, `useGetEstimate` + `getListEstimatesQueryKey`/`getGetEstimateQueryKey`.
  - **Frontend wiring**: `app/_layout.tsx` adds `ClerkTokenBridge` → calls `setAuthTokenGetter(() => useAuth().getToken())` from `api-client-react/custom-fetch.ts` (was already exported). `app/(tabs)/history.tsx` rebuilt: signed-out CTA → sign-in, signed-in shows list of cards (yacht label + type + length + date + €price), pull-to-refresh, empty/error/loading states, taps navigate to `/valuation/result?id=<id>`. `app/valuation/result.tsx` accepts `?id=` param and uses `useGetEstimate` to fetch when no inline `data` (history → result deep-link works); reconstructs `header` from saved `request` if needed.
  - **DB schema**: `migrations/001_estimates.sql` — `estimates` table (uuid id, `clerk_user_id text`, denorm `yacht_label/yacht_type/length_meters/estimated_price_eur/currency`, `request jsonb`, `result jsonb`), composite index on (`clerk_user_id`, `created_at desc`), RLS `deny_all` policy (service-role bypasses).
  - **Manual step required from owner once**: paste `migrations/001_estimates.sql` into Supabase SQL editor of `yachtworth-prod` project. Until then, history POST silently no-ops (logged as warn) and GET returns 401/empty.
  - Architect re-review: PASS after Clerk-key gate fix (was checking publishable + secret, now only secret). Typecheck green. Health screenshot of History tab confirmed signed-out state renders correctly.
- **Day 5 (current) — DONE:** Profile + Settings with "Powered by PDYE" + units toggle in Settings.
  - **Profile (`app/(tabs)/profile.tsx`)** trimmed and polished: real Clerk avatar (`user.imageUrl` if present, else gold initials, else generic icon), name, email, "Free plan · 1 estimate / month" gold chip (real plan in Day 6), Sign in CTA (signed-out) or Upgrade-to-Pro card (signed-in), single grouped menu (Settings → /settings, Sign out for signed-in users), short Powered by PDYE block (also taps to /settings), version footer.
  - **Settings (`app/settings.tsx`, new screen, registered in root Stack as `card` presentation, headerless with custom navy back-bar)**:
    - **Units** segmented control Metric (m, t) ↔ Imperial (ft, lt). Reads/writes the SAME `useUnits()` hook + AsyncStorage key as the form-header pill, so toggling here flips form, history, comparables, PDF immediately. Header-pill kept as quick access per owner request (both entry points live).
    - **Appearance** — Dark only, locked with check (Light v1.1+).
    - **About** — `App version` from `expo-constants`, `Privacy Policy` + `Terms of Service` rows open Alert placeholders ("full text published before App Store launch") — real copy comes Day 7.
    - **Powered by PDYE** — gold-bordered card, taps `expo-web-browser.openBrowserAsync("https://www.pdyegroup.com")` (in-app browser on native, plain Linking on web), navy toolbar + gold controls.
    - **Sign out** — danger-red bordered button at bottom (signed-in only).
  - No new deps (`expo-web-browser` + `expo-constants` already present). Typecheck green. Verified live via screenshots: Profile (signed-out → Guest card + Sign in + Settings + PDYE + version) and Settings (Units segment with Metric active + Appearance Dark + About group + PDYE card with Visit PDYE arrow).
- **Day 6 / Day 7 — DEFERRED by owner.** RevenueCat + paywall + App Store submission будут позже. Phase 2 (Charter ROI Intelligence) приоритетнее.

## Phase 2 — Charter ROI Intelligence (in progress)

Внутренний модуль Yachtworth (НЕ отдельное приложение) для AI-расчёта рентабельности яхты в чартере. 10 стадий, см. историю чата. Pro-only гейт — позже на Day 6.

- **Stage 1 (current) — DONE:** Архитектура + схема БД.
  - **Миграция `migrations/002_charter_roi.sql`** (Supabase, тот же проект `yachtworth-prod`): 4 таблицы — `yachts` (профили яхт пользователя, scoped by clerk_user_id), `roi_calculations` (сохранённые расчёты, FK на yachts с cascade), `market_rates` (seed чартерных дневных ставок по типу/длине/региону/сезону — пока пустая), `expense_rates` (региональные коэффициенты расходов — пока пустая). RLS deny_all на всех 4, service-role обходит.
  - **Константы в `artifacts/api-server/src/lib/supabase.ts`:** `YACHTS_TABLE`, `ROI_CALCULATIONS_TABLE`, `MARKET_RATES_TABLE`, `EXPENSE_RATES_TABLE`.
  - **OpenAPI `lib/api-spec/openapi.yaml` расширен:** новые теги `yachts` + `roi`, новые схемы `Yacht/YachtInput/YachtListResponse`, `RoiCalculationInput/RoiCalculation/RoiCalculationListItem/RoiCalculationListResponse/RoiCalculationDetail`, `ExpenseBreakdown`, `MonthlyPoint`, `YearlyPoint`, enum-ы `FinancingType/CharterRegion/CharterSeason/ManagementStyle/OccupancyTarget`. Эндпоинты: `GET/POST /yachts`, `GET/PATCH/DELETE /yachts/{id}`, `POST /roi/calculate` (контракт залочен, тело — стаб **501** до Стадии 3–5), `GET /roi/calculations` (с опц. фильтром `?yacht_id`), `GET /roi/calculations/{id}`. Все требуют `bearerAuth`.
  - **Роуты `artifacts/api-server/src/routes/yachts.ts`** — полный CRUD через Supabase service-role, scoping by `clerk_user_id`, валидация тела через `CreateYachtBody`/`UpdateYachtBody` (orval-сгенерённые zod), UUID-гард на path id (кривой id → 404, не 500).
  - **Роуты `artifacts/api-server/src/routes/roi.ts`** — list/get через Supabase, stub `POST /roi/calculate` возвращает `501`. UUID-гард на path id и query `yacht_id`.
  - **Хелпер `lib/validators.ts`** — `isUuid()` regex-гард, общий для всех новых роутов.
  - Codegen прогнан: новые хуки `useListYachts/useCreateYacht/useGetYacht/useUpdateYacht/useDeleteYacht/useCalculateRoi/useListRoiCalculations/useGetRoiCalculation`. Typecheck зелёный, api-server рестартован, smoke-тест: новые роуты отдают 401 без токена.
  - Code review (architect) PASS после фикса UUID-гарда. Известные не-критичные пункты на потом: integer-поля в orval генерятся как `number()` (общая проблема, не вношу в Стадии 1, чтобы не трогать существующие эндпоинты); OpenAPI не описывает `500/503` (тот же паттерн в `estimates.ts` — оставляю консистентным).
  - **Ручной шаг от владельца:** вставить `migrations/002_charter_roi.sql` в Supabase SQL editor (`yachtworth-prod` проект) → Run. До этого `/yachts` и `/roi/calculations` будут возвращать 500 при попытке записи.
- **Stage 2 (current) — DONE:** Charter ROI таб + форма профиля яхты.
  - **Решения владельца:** на v1 — одна активная яхта на пользователя (самая свежая по `updated_at` из списка; БД допускает много, ограничение чисто UI); модуль открыт всем подписавшимся (Pro-гейт позже на Day 6 с RevenueCat).
  - **Новый таб `app/(tabs)/charter.tsx`** между Home и History. Иконки: SF `chart.line.uptrend.xyaxis` (NativeTabs) + Feather `trending-up` (Classic). 3 состояния: signed-out → "Sign in to use Charter ROI" CTA; signed-in без яхты → "Create your yacht profile" CTA → `/roi/yacht-form`; signed-in с яхтой → summary card (название, тип/год, length с учётом units, cabins/guests/crew, marina, purchase) + редактор-иконка `/roi/yacht-form?id=` + disabled "Calculate ROI" с надписью "ROI engine arrives in the next update" (хендлер ждёт Стадию 6).
  - **Wizard `app/roi/yacht-form.tsx`** — 3 шага (Basics / Operations / Financing), один экран и для create, и для edit (через `?id=`). Степ-индикатор сверху, навигация Continue/Back, primary CTA снизу. Поля: type-пилюли × 4, name ИЛИ brand+model (одно из), length (метры/футы — отображение зависит от units), year_built, cabins/guests/crew, marina_location, flag, engine_hours, commercial_registration (Yes/No пилюли), purchase_price_eur, purchase_year, financing_type (cash/loan пилюли — loan-поля показываются условно: loan_amount_eur, loan_rate_pct, loan_term_years). Инлайн-валидация по шагам, ошибки показываются только после клика Continue.
  - **Units-безопасность (после code review).** Глобальные units из `useUnits()` снапшотятся в локальный `formUnits` при маунте и **не меняются на лету**, иначе мид-формы переключение pill'а в Settings было бы интерпретировано как 3.28× ошибка в length. На submit конвертация в метры через `formUnits` — API всегда получает метры (golden rule).
  - **Prefill edit-mode.** `lastPrefilledIdRef` keyed by `editId` (не one-shot), так что переход между яхтами в той же сессии корректно перезаполняет форму. Loading → spinner; `getYacht.isError || !data` → дедикейтед "Yacht not found / no access" экран с Back, не пустая редактируемая форма.
  - **Auth-гейт.** Если `!isSignedIn` после `isLoaded` — экран показывает Sign in CTA и редирект в `(auth)/sign-in`. На бэке IDOR уже закрыт scoping by `clerk_user_id` (Стадия 1).
  - **Кэш react-query.** На успех `createYacht`/`updateYacht` инвалидируется `listYachts` + `getYacht(id)` — таб Charter сразу подхватывает новые данные.
  - Регистрация `roi/yacht-form` в root Stack `app/_layout.tsx` (`presentation: card`). Typecheck зелёный. Architect re-review PASS после фикса units + prefill + error-state.
  - **Что осталось не сделано (намеренно, под будущие стадии):** реальная кнопка Calculate ROI (Стадия 6, откроет сценарий-шит → `useCalculateRoi`); кнопка "Delete yacht" в edit-форме (добавлю когда понадобится — пока на v1 одна яхта и owner может править её бесконечно); множественный выбор активной яхты (v1.1).
- **Stage 2.5 (current) — DONE:** Полная анкета расходов в форме яхты (по запросу владельца "важно чтобы в анкете были указаны все возможные расходы — операционные в месяц, регуляторные в год").
  - **Миграция `migrations/003_yacht_expenses.sql`** (ALTER TABLE yachts, идемпотентная): 8 monthly numeric(12,2): `monthly_crew_eur, monthly_mooring_eur, monthly_fuel_eur, monthly_provisioning_eur, monthly_communications_eur, monthly_maintenance_eur, monthly_management_fee_eur, monthly_misc_eur` + 5 annual numeric(12,2): `annual_insurance_eur, annual_registration_eur, annual_classification_eur, annual_antifouling_eur, annual_refit_reserve_eur` + `charter_commission_pct real` (% of gross charter revenue).
  - **OpenAPI расширен:** все 14 полей добавлены в `YachtInput` (number|null, min 0; commission также max 100) и в `Yacht` response. Codegen перегенерил zod + хуки.
  - **Backend:** `YACHT_COLUMNS` в `routes/yachts.ts` обновлён — SELECT теперь возвращает все новые колонки. `CreateYachtBody`/`UpdateYachtBody` zod-валидируют их автоматически.
  - **Форма выросла с 3 до 4 шагов:** Basics → Operations → **Expenses** → Financing. Новый шаг показывает 3 секции с золотыми лейблами: MONTHLY · € PER MONTH (8 строк), ANNUAL · € PER YEAR (5 строк), CHARTER (broker commission %). Все поля опциональны с hint "Empty fields will fall back to regional averages." Новый компонент `MoneyInput` (input + suffix `€ / mo` / `€ / yr` / `%`). Валидация числовая по `DEC_RE`; commission 0–100.
  - **Submit payload:** 1-to-1 mapping по именам (`monthly_crew_eur: numOrNull(form.monthly_crew_eur)` и т.д.). Prefill из `useGetYacht` через `toStr()` хелпер. Pустые значения → `null` (не `0`), чтобы Стадия 3 ROI engine отличала "не указано → fallback на market average" от "указано 0 → реально нулевая статья".
  - Typecheck зелёный по всему монорепо, api-server рестартован, health 200. Architect re-review PASS.
  - **Hardening — на потом (architect note, не сейчас):** DB-level CHECK constraints для >=0 и commission [0,100]; верхние границы расходов в API чтобы предотвратить overflow numeric(12,2) → 500 (сейчас будет ловиться зодом частично, но без явных max).
  - **Ручной шаг от владельца:** вставить `migrations/003_yacht_expenses.sql` в Supabase SQL editor → Run. Если 002 ещё не накатывался — сначала 002, потом 003.
- **Stage 3 (next):** ROI calculator engine — серверный движок расчёта (revenue по market_rates × occupancy × season; expenses сначала из owner-known overrides из Стадии 2.5, fallback на expense_rates × management_style; чистый ROI / payback / IRR), снимет 501 с `POST /roi/calculate`. Seed market_rates + expense_rates перед этим.

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
