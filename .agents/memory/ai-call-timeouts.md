---
name: OpenAI helper calls must have an AbortController timeout
description: Why the shared OpenAI fetch helpers (aiResponses/aiChat) need per-call timeouts or the proxy 502s.
---

# OpenAI fetch helpers must time out (`artifacts/api-server/src/lib/valuation/openai.ts`)

`aiResponses` / `aiChat` use bare `fetch`, which has NO default timeout. When OpenAI (especially `web_search_preview`) hangs, the socket stays open and the WHOLE inbound request blocks until the shared reverse proxy aborts it at ~120s → the mobile client sees **HTTP 502** with a Replit "couldn't reach this app" HTML page (looks like a server crash but isn't).

**Why:** the ROI "Run AI estimate" report (`pricing_mode:"ai"` → `computeAiRevenue`) and the valuation AI path both call these helpers; a slow web_search call produced repeated 120000ms `request aborted` (statusCode null) entries and a 502 in the app.

**How to apply:** both helpers wrap fetch in `fetchWithTimeout(url, init, timeoutMs)` (AbortController + clearTimeout). The thrown timeout error is caught by callers so a hung model degrades to the deterministic heuristic instead of 502. Keep worst-case well under the 120s proxy cutoff; dual-region runs the two `computeAiRevenue` calls in parallel (`Promise.all` in `index.ts`), so a single per-call ceiling (not the sum) must fit the budget.

## Charter ROI web_search: timeout too short + tool-less fallback was harmful
A real Charter ROI `web_search_preview` call runs **~9 search rounds and takes ~50–65s** (measured). The old 45s Responses ceiling **aborted every real search mid-flight**, then fell back to a **tool-less `aiChat()`** which cannot browse — the model literally returned *"I cannot perform live web searches from this environment"* into the report, plus €0 rates for any region it had no memory of (e.g. Middle East) → fixed_table_weeks × €0 = **€0 income**.
**Why:** web search itself works fine on `gpt-5-mini` (probe: 200, `web_search_call` completed); the failure was purely the timeout + an unsafe fallback that produced confident garbage instead of an honest heuristic.
**How to apply (now in code):** Responses timeout raised to **95s**; the Charter ROI call bounds the search with `search_context_size:"low"` + `max_tool_calls:5` (via new optional `maxToolCalls` arg on `aiResponses`); the tool-less `aiChat` fallback was **removed** from `computeAiRevenue` — any Responses failure/unparseable JSON goes straight to `heuristicAiFallback(args, "Live market search unavailable; heuristic fallback used.")`. A **zero-rate guard** (`daily<=0 || weekly<=0 || comparables.length===0`) also routes to the heuristic so a parseable-but-empty AI answer can never inject €0. Never reintroduce a no-tool chat fallback for a search-dependent result.
