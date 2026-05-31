# Yachtworth

Standalone luxury mobile app (iOS + Android) — AI-powered yacht **estimates** + Charter ROI + Annual Cost + Charter Planner + Yacht Profile hub. Spinoff from PDYE; separate brand, shared backend.

## Product

- **Audience:** yacht owners + brokers/surveyors
- **Brand:** deep navy `#0B1E3F` + champagne gold `#C9A961`. Gilroy headings + Inter body. Dark only (Light v1.1+).
- **PDYE cross-link:** "by the team behind PDYE" in onboarding; "Powered by PDYE" in Settings → `pdyegroup.com` (in-app browser).
- **Legal:** every estimate/ROI/cost result has server-injected disclaimer ("indicative · not certified · valid 30 days").

## Stack

- **Frontend:** Expo React Native (`artifacts/yachtworth-app`)
- **Backend:** shared `artifacts/api-server` Express 5 at `/api`
- **DB:** Supabase `yachtworth-prod` (Frankfurt). RLS `deny_all`; service-role bypasses; everything scoped by `clerk_user_id` (no IDOR).
- **Auth:** Clerk — Apple SSO + Google SSO + email/password. `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`.
- **AI:** OpenAI `gpt-5-mini` via Responses API + `web_search_preview` → `/chat/completions` fallback → deterministic heuristic. Key: `YACHTWORTH_OPENAI_API_KEY` → Replit AI proxy. Listing copy uses Anthropic `claude-sonnet-4-6` via Replit AI Integrations proxy (`AI_INTEGRATIONS_ANTHROPIC_*`).
- **Subscriptions (deferred):** RevenueCat. Pro €49.99/mo, Basic €19.99/mo, Free 1 estimate/mo, 7-day trial.
- **Deployment:** Render (separate service from PDYE).

## Repo layout

- `artifacts/yachtworth-app/app/`
  - `(tabs)/` — Home, Tools, My Yacht, PDYE, Profile
  - `(auth)/sign-in.tsx` + `sign-up.tsx`
  - `valuation/{new,result}.tsx` — yacht estimate wizard
  - `roi/{yacht-form,calculate,result}.tsx` — Charter ROI
  - `cost/{new,result}.tsx` — Annual cost
  - `my-yacht/{edit,[id]}.tsx` — yacht profile hub
  - `charter-planner.tsx`, `charter-form.tsx`, `client-detail.tsx`, `charter.tsx`, `history.tsx`, `settings.tsx`
- `artifacts/yachtworth-app/components/` — `YachtCard`, `CompletenessBar`, `ComingSoonModal`, `PhotoSection`, `EquipmentSection`, `AIRateEstimator`, …
- `artifacts/yachtworth-app/lib/` — `charterCalc.ts`, `charterExports.ts`, `yachtCompleteness.ts`, `equipmentConfig.ts`, `photoCompression.ts`, `photoUpload.ts`, `pdf.ts`
- `artifacts/api-server/src/`
  - `routes/{valuations,estimates,yachts,roi,costEstimates,charters,clients}.ts`
  - `lib/{valuation,roi,cost-estimate}/` engines + `lib/supabase.ts` + `lib/validators.ts` (`isUuid`)
  - `middlewares/clerkAuth.ts` (`softClerkAuth` + `requireAuth`)
- `lib/api-spec/openapi.yaml` — single source of truth → orval generates hooks + zod
- `migrations/` — Supabase SQL (owner runs manually)

## DB migrations — owner-run order

Run sequentially in Supabase SQL editor of `yachtworth-prod`. All idempotent.

1. `001_estimates.sql` — yacht estimates persistence
2. `002_charter_roi.sql` — yachts + roi_calculations + market_rates + expense_rates
3. `003_yacht_expenses.sql` — 14 expense fields on yachts (8 monthly + 5 annual + commission %)
4. `004_crew_breakdown.sql` — `yachts.crew_breakdown jsonb`
5. `005_seed_rates.sql` — market_rates (54) + expense_rates (32) + RPC `get_roi_rates`
6. `007_cost_estimates.sql` — cost_estimates table
7. `008_charter_planner.sql` — charters + clients; adds `photo_url`+`notes` to yachts
8. `009_charter_planner_full.sql` — 35+ charter fields (APA, distribution jsonb, expanded crew, NOT NULL numerics)
9. `010_central_agent_subagents.sql` — central_agent + sub_agents jsonb on charters
10. `011_yacht_profile.sql` — yacht profile fields + `is_archived`
11. `012_yacht_equipment.sql` — `yacht_equipment` table (~60 items, 8 categories, cascade-delete)
12. `013_yacht_photos.sql` — `photo_urls jsonb` + `cover_photo_url`; Supabase Storage bucket `yacht-photos` (public, 5 MB cap, image/* allow-list) + `public_read_yacht_photos` policy
13. `014_roi_check_constraints.sql` — DB-level CHECK constraints (commission/VAT/APA `[0,100]`, prices/loans/revenue/expenses `>=0`)
14. `015_link_history_to_yachts.sql` — nullable `yacht_id` FK on estimates + cost_estimates (ON DELETE SET NULL) + partial indexes
15. `016_listings.sql` — `listings` table (yacht_snapshot/settings_snapshot jsonb, RLS deny_all, indexes on clerk_user_id + yacht_id)
16. `017_proposals.sql` — `proposals` table (yacht_snapshot/settings_snapshot/equipment_snapshot jsonb, RLS deny_all, FK ON DELETE SET NULL, indexes on clerk_user_id + yacht_id)
17. `018_survey_reports.sql` — `survey_reports` + `survey_items` + `survey_sea_trial` (RLS deny_all; cascade-delete items + sea_trial on report delete; recommendation counters on report)
18. `019_survey_items_section_replace.sql` — PL/pgSQL function `replace_survey_section_items(report_id, section_number, items jsonb)` — **atomic** per-section delete+insert+counter-recompute. Required for safe concurrent section edits.
19. `020_survey_item_photos.sql` — Supabase Storage bucket `survey-item-photos` (public, 5 MB cap, image/* allow-list) + `public_read_survey_item_photos` policy. Required for per-item photo upload.
20. `021_survey_item_photo_atomic.sql` — PL/pgSQL functions `survey_item_append_photo(item_id,url,max)` + `survey_item_remove_photo(item_id,url)`. Row-level `FOR UPDATE` lock + RAISE EXCEPTION P0001 for limit / P0002 for missing. Backend calls these via RPC instead of read-modify-write — prevents lost updates and orphan storage when two uploads/deletes race.

Until each is run the corresponding feature degrades (POSTs no-op warn-logged, GETs empty/401, engines fall back to heuristics).

## Build status — features DONE

- **Yacht Estimates** (Days 1–5): 5-step wizard, builder/specs mode toggle, units toggle (metric/imperial, contract metric-only), AI with web_search comparables + confidence + source pills, PDF export, History tab, Supabase persistence.
- **Charter ROI** (Phase 2): 3 pricing modes (manual_daily/manual_weekly/ai), loan annuity, 5y depreciation w/ Med seasonal weights, full expense questionnaire, crew_breakdown jsonb, data-driven baselines via `005_seed_rates`. **T-AIRateEstimator** (May 2026): "AI Estimate" button next to rate field → `POST /roi/ai-rate-estimate` calls gpt-5-mini + web_search w/ 8 broker platforms + region-specific seasons; rounds (€100 weekly / €50 daily); auto-downgrades confidence to "low" if `comparables_found < 3` or missing; sanitises sources to bare hosts; never returns 500 (3-level fallback). Yacht-load DB error → 503 (matches OpenAPI).
- **Annual Cost Estimator** (Stages A1–A4): pure deterministic calculator, 4-step wizard, 8 annual maintenance fields + crew months_per_year stepper, soft auth (guest calc, signed-in save), History segment + swipeable delete w/ concurrent-safe `pendingIds`.
- **Navigation** (5-tab): Home (2×2 role grid + persists `yachtworth.tools.role`), Tools (12 cards, 3 LIVE + 9 SOON, role chip filter, ComingSoonModal w/ notify-me list `yachtworth.coming_soon_notify`), My Yacht, PDYE (gold CTA → `expo-web-browser` to pdyegroup.com), Profile/Settings. Charter & History as root Stack screens w/ back-FAB.
- **Charter Planner** (Phase 3): `/charter-planner` 3-tab (Fleet/Calendar/Clients). Fleet w/ today-status dots, Gantt calendar (sticky yacht col + scrollable day cells), Clients list + detail. Exports: per-charter PDF + monthly fleet PDF + Excel-safe CSV (formula injection prefix-escape `=+-@\t\r`). `charter-form.tsx` = 11 sections w/ reusable DateField/Stepper/TimeInput/EuroField. Pure `charterCalc.ts` (shared form↔exports): VAT on top, APA never enters net P&L, UTC-parsed dates, custom distribution residual. Server `normalizeCharterPayload()` coerces `null`→`0` for 19 NOT NULL numerics. Central agent + 3 sub-agents w/ live preview.
- **My Yacht Foundation** (T009): central yacht profile hub. Add/Edit Yacht = 7 collapsible sections + sticky save bar + units snapshot at mount + IMO 7-digit filter + validation (name/type/year/length). YachtCard w/ photo/anchor fallback, completeness bar, 2×2 actions. `(tabs)/my-yacht.tsx` w/ active/archived segments + "Show archived (N)". Detail screen `[id].tsx` = Overview/History/Documents tabs + overflow menu (Edit/Archive/Delete). `lib/yachtCompleteness.ts` w/ `calcCompleteness`/`nextSuggestedField` (stepper-numeric `0` = missing).
- **Equipment** (T-Equipment): Section 8 in Add/Edit Yacht = ~60 items in 7 collapsible groups (sailing gated by yacht_type). `yacht_equipment` table (one row per logical unit), `ToggleRow` + `MultiRow` (generators/tenders/jetskis w/ Add/Remove + maxUnits). PUT = replace-all atomically. Read-only block on Detail Overview. `calcEquipmentBonus` adds completeness bonus, never penalises. Equipment never flows into ROI/Cost/Charter/Valuation.
- **Photo Upload** (T-PhotoUpload): Section 6 = real multi-photo uploader. Up to 10 photos/yacht, auto-compressed ≤800 KB JPEG (1920px, 75%→55% second pass). First = cover; long-press = set cover. Backend writes via service-role (mobile never touches storage creds), `multer` memoryStorage 5 MB cap. Routes: `POST /yachts/:id/photos` (multipart), `DELETE`, `PATCH …/cover`. Storage upload rolled back if DB update fails. `DELETE /yachts/:id` best-effort storage cleanup. Multipart endpoints NOT in OpenAPI (frontend fetches directly via `getBaseUrl()` + `getAuthToken()`). iOS ActionSheet / Android Alert source picker. Sequential uploads keep order deterministic.
- **History merge** (T-LinkHistoryToYacht, May 28): estimates + cost_estimates link to `yacht_id`. YachtCard Valuations/Costs actions navigate with `?yacht_id=`; wizards read `useLocalSearchParams`. Yacht Detail → History merges 3 parallel filtered queries (charters/estimates/cost-estimates) sorted desc by ts. New `EstimateRow` + `CostRow` w/ kind label.
- **Yacht Proposal Builder** (T-YachtProposal, May 28 + v3 May 28): Tools card → `/yacht-proposal` flow. Pure document builder — **no AI**. Entry picker (active yachts + manual). `form.tsx` = settings (proposal_type sale/charter/both, language en/fr/it/es/de/ru, optional sale + charter pricing w/ APA & VAT, broker contact fields, "Confidential" watermark toggle); manual mode adds yacht fields (name/builder/model/type/year/dims/flag/cabins/guests/crew/berths). `preview.tsx` = summary card + Export PDF (expo-print + Sharing) + Save to My Proposals. `lib/proposalPdf.ts` builds **guaranteed 4-page** A4 in **v3 template**: Cover = full-bleed hero photo (`position:absolute` 100%) w/ gold eyebrow + bottom gradient overlay carrying yacht name, subtitle, 5-cell spec grid (year/length/guests/flag/base) + big asking price + date footer; inner pages = white background, gold "YACHTWORTH · VESSEL PROPOSAL" eyebrow + navy yacht name right + thin gold rule; spec/accommodation tables = gold uppercase labels + navy values on white w/ light dividers; equipment = inline tag layout grouped by 8 categories; Pricing = 2-column beige boxes (FOR SALE / FOR CHARTER) w/ 4px gold left border; Contact = same beige + gold left border card. 6-language label dict + `per_week` localized + diagonal "CONFIDENTIAL" watermark (soft gold on white). `POST /proposals` validates body via generated `SaveProposalBody` zod schema; persists snapshot (no AI). `GET /proposals` list / `GET /:id` re-open / `DELETE /:id`. RLS deny_all; soft auth + requireAuth; isUuid guards; yacht_id ownership verified server-side. "My Proposals" under Profile → list/preview/open/delete. Tools count = 4 LIVE + 8 SOON.
- **Listing Generator** (T-ListingGenerator, May 28): Tools card → `/listing` flow. Entry picker = active yachts from My Yacht + manual button. `form.tsx` = yacht snapshot (basics/flag/perf/highlights/equipment tags/pricing) + settings (listing_type/style/language/word_length/tone/sections/brokerage). `POST /listings/generate` calls Claude `claude-sonnet-4-6` via Anthropic helper with broker-grade system prompt; 3-level fallback to deterministic template (never 500). `result.tsx` renders markdown subset (h2/h3/**bold**/bullets), in-place edit, Copy/Regenerate (with seed)/Save/Export PDF/Share. PDF via `lib/listingPdf.ts` (navy/gold branded, hero photo placeholder, optional broker footer). "My Listings" under Profile → list/preview/open/delete. RLS deny_all; soft auth + requireAuth; isUuid guards; `generated_text` capped at 20000 chars; brokerage/email sanitised.
- **Survey Report Builder — core flow** (T-SurveyReportBuilder, May 28): Tools card → `/survey` flow. Professional YDSA/IIMS-style pre-purchase reports. **Concurrency-safe replace:** `PUT /items` accepts optional `section_number` — when set, server invokes `replace_survey_section_items` RPC (migration 019) which atomically deletes+reinserts ONLY that section and recomputes counters in one PL/pgSQL transaction. Section editor always sends `section_number`, so concurrent edits in other sections cannot be lost. Full-replace path retained only for first-time seeding when the report has 0 items. **List screen** (`app/survey/index.tsx`) = Draft / Complete segments + counts, swipe-delete, "New Survey" gold CTA, recommendation badges (A=red, B=amber, none=green-Clean). **Setup screen** (`app/survey/new.tsx`) = 4 collapsible sections (Vessel/Client/Surveyor/Conditions), saves report then seeds default items from all 26 section templates via `PUT /items`. **Sections list** (`app/survey/[id]/index.tsx`) = 26-row checklist with progress counter + per-section status icon (complete/partial/warning/urgent) + rec-level badge; tap row → section detail (only for `kind="items"`; other section types show Alert info). **Section detail** (`app/survey/[id]/section/[n].tsx`) = per-item editor with description / condition picker / notes / recommendation picker (A–D w/ short+full text) / optional moisture (section 6 — Hull only); Add Item dashed-gold button; Save merges this section's edits with all other sections' unchanged items and `PUT`s the full list (server is replace-all). Bottom-sheet pickers via `Modal`. **`lib/surveyTemplates.ts`** = SECTION_TEMPLATES (26 sections incl. items / sea-trial / declaration / pictures / glossary / auto-recs kinds), GLOSSARY/DECLARATION text constants, CONDITION_OPTIONS + REC_OPTIONS (A=Urgent / B=Soon / C=Routine / D=Future), `sectionStatus()` helper. **Backend** (`routes/surveyReports.ts`): CRUD reports + `PUT /items` (replace-all, recomputes counters A/B/C/D in single update) + `PUT /sea-trial` (upsert one row per report); soft auth on list (returns empty for guests), requireAuth on writes; isUuid guards on params; ownership verified server-side before any item/sea-trial write. RLS deny_all; service-role bypasses. OpenAPI codegen produces full hook + zod set; typecheck green both api-server + yachtworth-app. Tools count = 5 LIVE + 7 SOON.
  - **PDF export** (T-SurveyPdf, May 28): `lib/surveyPdf.ts` builds professional white A4 multi-page report. Cover = navy/gold branded + vessel spec table + Surveyor/Client side-blocks; one page per template section; items rendered as table (#/Description+Notes+Moisture+Rec / Condition) with **recommendations in BLUE ITALIC** per industry convention + colour-coded A/B/C/D badges (red/amber/blue). Auto-recs section groups all recs by urgency level with item+section reference. Declaration page = full text + signature line + surveyor name. Pictures page = 2-col grid auto-collected from every item's `photo_urls` (https only, escaped). Sea trial page = meta table + RPM/coolant/oil/speed table + narrative (falls back to "Sea trial was not conducted" when null). `@page A4 15mm 20mm` margins, system fonts, page-break per section, `escapeHtml` everywhere. `exportSurveyPdf()` = `Print.printToFileAsync({width:595,height:842}) → Sharing.shareAsync`. Wired to "Generate PDF Report" button in `app/survey/[id]/index.tsx` with ActivityIndicator + try/catch Alert. `seaTrial` arg currently always null (UI screen still deferred — section renders "not conducted" placeholder).
  - **Sea Trial UI** (T-SurveySeaTrial, May 28): `app/survey/[id]/sea-trial.tsx` — meta (date/location/weather/sea state) + RPM table (port/stbd engines, add/remove rows) + tickover + max RPM/speed + narrative + additional observations. Saves via `useUpsertSurveySeaTrial`. Section tap with `kind="sea_trial"` now routes here.
  - **Signature pad** (T-SurveySignature, May 28): `react-native-signature-canvas@5` + `react-native-webview@13` installed. `app/survey/[id]/signature.tsx` — full-screen pad over ivory canvas with navy ink, Clear/Save controls; stores result as `data:image/png;base64,…` directly in `survey_reports.surveyor_signature_url` (text column, no migration). Web platform shows graceful "open on phone" fallback. Declaration section tap routes here. PDF `buildDeclarationSection` renders signature as `<img src>` when present (validates `https://` OR `data:image/{png,jpeg,webp};base64,` — anything else falls back to empty signature line). `.sig-img` CSS: 60% width × 30mm max-height contain.
  - **Auto-recommendations summary** (T-SurveyRecs, May 28): `app/survey/[id]/recommendations.tsx` — collects all items with `recommendation_level` set, groups by A/B/C/D urgency, shows item ref + section ref + full text. Section 23 tap routes here.
  - **Surveyor profile** (T-SurveyorProfile, May 28): `app/surveyor-profile.tsx` + `lib/surveyorProfile.ts` (AsyncStorage key `yachtworth.surveyor.profile`) — name/qualification/company/phone/email. Profile tab row "Surveyor profile" navigates here. `new.tsx` prefills surveyor fields from this store via `useEffect` so each new report inherits defaults.
  - **Per-item photo upload** (T-SurveyItemPhotos, May 28): `lib/surveyItemPhotoUpload.ts` mirrors yacht photoUpload (auto-compressed via `compressPhoto`). Backend `POST /survey-items/:itemId/photos` (multipart, multer memoryStorage 5 MB) + `DELETE` route in `surveyReports.ts`. `loadOwnedItem` helper resolves report_id from item then verifies ownership via `verifyOwnership`. Storage path `${reportId}/${itemId}/${ts}_${rand}.{jpg|png|webp}`. DELETE defence-in-depth: refuses URLs outside the item's own folder. Storage upload rolled back if DB update fails. Section detail UI shows `Photos (N/10)` block per item with thumbnail grid + dashed-gold add button + per-thumb × delete; gated on `it.id` (new items show "Save section once to attach photos"). iOS ActionSheet / Android Alert source picker. Multipart endpoints NOT in OpenAPI (matches yacht photo pattern); frontend uses `getBaseUrl()` + `getAuthToken()`. Photos auto-flow into PDF Pictures gallery (already collects from items.photo_urls).
  - **Photo UX polish + concurrency hardening** (T-SurveyPhotoPolish, May 28): (a) **Multi-select** — library picker now uses `allowsMultipleSelection` + `selectionLimit = min(remaining, 5)`; uploads run sequentially to keep order deterministic and respect the server row lock. (b) **Full-screen preview** — tap any thumbnail → black Modal with `expo-image contentFit="contain"` + close button respecting safe-area. (c) **Atomic DB updates** — backend now calls `survey_item_append_photo` / `survey_item_remove_photo` RPCs (migration 021) instead of `.update({photo_urls})`. Read-modify-write race that could drop URLs is closed; P0001 mapped to 400, P0002 to 404, storage object rolled back if RPC fails. (d) **Section save merges fresh photos** — `onSave` calls `detailQ.refetch()` first, builds a Map of `id → photo_urls` from the freshest server state, and the section-replace payload uses that map per item id (falls back to local snapshot only if refetch fails). Prevents the section editor from rolling back uploads/deletes performed elsewhere while the editor was open.
  - **Section editor polish — reorder + pinch-zoom + auto-save** (T-SurveyEditorPolish, May 28): (a) **Item reorder** — each item card head has up/down chevrons next to the delete button; first item's up + last item's down are disabled-greyed; uses simple swap (no new package). (b) **Pinch-zoom in preview** — full-screen photo Modal now wraps Image in a ScrollView with `maximumZoomScale=3`, `minimumZoomScale=1`, `centerContent`; gives free native pinch-to-zoom on iOS (Android falls back to tap-to-dismiss — `ScrollView.maximumZoomScale` is iOS-only; true cross-platform pinch needs a gesture-handler wrapper, deferred). (c) **Auto-save every 30 s** — `dirtyRef` flips true on any `updateItem`/`moveItem`/`addItem`/`removeItem`; `setInterval(30_000)` runs `onSave({silent:true})` only when dirty AND not currently saving AND no picker/preview/upload is open. Silent path skips `invalidateQueries` and `router.back()` so the re-seed `useEffect` never wipes in-flight keystrokes, and swallows errors (user still sees alerts on manual Save). Small "Auto-saved · HH:MM" hint above the Save bar.
  - **Deferred** (next iteration): drag-and-drop reorder via `react-native-draggable-flatlist` (current up/down buttons are simpler and don't require a scroll-list refactor), offline AsyncStorage sync queue (architect-flagged: breaks concurrent-safe section replace because each device would hold a divergent buffer that overwrites server state on reconnect — needs a CRDT/per-section merge strategy, real engineering project), $89/mo Surveyor-tier gate (RevenueCat already deferred at owner request), Android cross-platform pinch-zoom (would need gesture-handler `PinchGestureHandler` + reanimated transform, ~30 LOC + per-device testing). Sections of kind `pictures` still show informational Alert on tap (gallery is built at PDF render time from items.photo_urls).

- **Backend Document Generation Engine** (May 31): server-side universal document engine. PDF via `puppeteer-core` (Chrome from env `PUPPETEER_EXECUTABLE_PATH`→`REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE`→`CHROME_BIN`/`GOOGLE_CHROME_BIN`), DOCX via `docx` package. Lives in `artifacts/api-server/src/documents/` (`generateDocument.ts` dispatcher → `pdf/` + `docx/` generators+templates; `documentTypes.ts` with template normalize minimal/classic/premium, legacy `dark`→premium). Route `POST /api/documents/generate` = binary response (Content-Type + Content-Disposition), `softClerkAuth+requireAuth` gated, manual body validation. **First consumer = Yacht Proposal export.** `preview.tsx` now has 3 export buttons: "Export Professional PDF" (server) + "Export Word (DOCX)" (server) + **"Export Legacy PDF" (existing on-device generator, untouched)**. Frontend helper `lib/documentExport.ts` maps yacht/equipment/settings → backend body, writes via `expo-file-system/legacy` + Sharing (native) / blob download (web). **Additive only** — no Supabase schema change, no other-tool code touched, Legacy path preserved. Binary endpoint NOT in OpenAPI (matches photo-upload pattern). api-server `engines.node >=22.12` (puppeteer-core@25 req). **Render deploy:** image must include Chromium + set `PUPPETEER_EXECUTABLE_PATH`; Node ≥22.12 (DOCX works without Chrome).
- **Adaptive Document Engine — valuation PILOT** (May 31): block-based PDF layout that packs sections onto pages (kills legacy "one section = one page" empty-space). **Opt-in** via `exportSettings.engine` (`"adaptive"` opts in; missing/unknown → `"legacy"` default). Scope this step = `valuation_report` PDF only; proposal + all DOCX stay legacy, untouched. Lives in `artifacts/api-server/src/documents/`: `core/{types,util,paginateBlocks,theme,renderBlocksToHtml}.ts` + `blocks/*` (9 theme-agnostic blocks returning `{estimatedHeight mm, html, standalone?, splittable?}`) + `templates/valuationAdaptive.ts`. Greedy bin-packer (`PACK_BUDGET_MM=240`, conservative vs ~265 true usable) honours standalone cover; every block `break-inside:avoid` (no orphan headings); `splittable` lets unbounded notes flow across pages. Template **duplicates** legacy label dict (6 langs) + money/confidence/impact/spec helpers (legacy left byte-identical per hard rule). `moneyOf` escapes caller-supplied currency code. No Supabase/calc/route change (route already passes `exportSettings` wholesale). Verified: Serenity full payload legacy=6pp → adaptive=4pp, no empty/overflow pages. DOCX + frontend wiring deferred to next step.
- **Valuation export → backend adaptive + proposal cleanup** (May 31): (A) Valuation result screen's primary "Export PDF report" now calls the backend adaptive engine (`documentType:"valuation_report"`, `format:"pdf"`, `exportSettings.engine:"adaptive"`); on-device generator kept as secondary "Export legacy PDF" link. `lib/documentExport.ts` extracted shared `downloadDocument(body,format,fileName)` transport (proposal byte-behaviour preserved) + added `exportValuationDocument({result,header})` with `parseEuro` (null for abbreviated/non-numeric → keeps orig as note), `parseLengthMeters` (ft/'→×0.3048, 1dp), confidence high85/medium60/low30, vat paid→"VAT Paid / EU Free Circulation"/not_paid→"VAT Not Paid (offshore)". (B) Proposal builder cleanup: `yacht_type` humanized in spec table; explicit `VAT_LABELS`+`vatLabel()` (enum→human); sale-only proposals omit mid-doc commercial summary (was duplicating price + unbalanced half-column) by gating on `showCharter`; `theme.ts` cover overlay darker bottom scrim + text-shadow for legibility over photos. Additive only — DOCX/legacy/charter+both paths untouched.
- **Collapse-on-entry UX** (May 28): every screen entry (mount, back-nav, post-save return) resets collapsible sections — only the first stays open. Implemented via `useFocusEffect` in `my-yacht/edit.tsx` + `charter-form.tsx`; `EquipmentSection.tsx` initial state opens first visible group.

## Not in v1.0

Push notifications, multi-language, corporate accounts, marketing site. All v1.1+.

## Deferred (not approved by owner)

- Per-comparable freshness badges (`fresh/verify/stale`) for AI sources — revisit after real-world stale-listing complaints
- Broker tier in pricing, GDPR copy under results, free-tier hard limit on backend
- ROI no-hit rounding unit test (requires vitest scaffolding in api-server)
- A11y backfill on `cost/new` crew toggles + step pills
- Numeric overflow upper-bounds on `numeric(12,2)` columns
- Estimate "save as new version" / share-by-link / multi-estimate compare
- `yacht_id` on `EstimateDetail`/`CostEstimateDetail` (so detail screens can link back to yacht — list view sufficient for History)
- Photos: full-screen preview w/ zoom, offline upload queue, "Browse files" option, reordering

## Run

- `pnpm --filter @workspace/yachtworth-app run dev` — Expo (workflow `artifacts/yachtworth-app: expo`)
- `pnpm --filter @workspace/api-server run dev` — Express (port 5000, served at `/api`)
- `pnpm run typecheck` — full monorepo
- `pnpm --filter @workspace/api-spec run codegen` — regen hooks + zod from openapi.yaml

## Architecture decisions

- One shared backend (`api-server`) for web + mobile, not a separate `yachtworth-api`.
- Supabase = primary DB; Drizzle schemas in `lib/db/` mirror Supabase tables.
- Brand navy/gold hard-referenced in screen files (not via `useColors()`) — luxury identity must render dark regardless of system theme.
- **API contract is metric-only** (golden rule). Units conversion in UI only; form-level `formUnits` snapshotted at mount → prevents 3.28× corruption on mid-form Settings toggle.
- AI paths always have deterministic fallback → engine never returns 500 from AI.
- Soft auth on guest-friendly POSTs (`/valuations`, `/cost-estimates`): calc always returned, persistence only if signed in.

## User preferences

- Russian conversation with owner, simple words, no jargon
- **App UI must be in English** (international audience)
- Owner is non-technical
- Do not re-ask questions already answered in this file
- Brand visual: navy `#0B1E3F` + gold `#C9A961`, Gilroy + Inter

## Required secrets

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `YACHTWORTH_OPENAI_API_KEY` (optional — falls back to Replit AI proxy)
- `CLERK_SECRET_KEY` + `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- RevenueCat keys (deferred)

## Pointers

- `expo` skill — mobile dev guidelines
- `pnpm-workspace` skill — workspace structure
- `attached_assets/` — original PDYE spec PDFs (questionnaire, prompt spec, units toggle, T009, charter, equipment, photo upload, AI rate estimator)
