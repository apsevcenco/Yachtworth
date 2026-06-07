---
name: OpenAI helper calls must have an AbortController timeout
description: Why the shared OpenAI fetch helpers (aiResponses/aiChat) need per-call timeouts or the proxy 502s.
---

# OpenAI fetch helpers must time out (`artifacts/api-server/src/lib/valuation/openai.ts`)

`aiResponses` / `aiChat` use bare `fetch`, which has NO default timeout. When OpenAI (especially `web_search_preview`) hangs, the socket stays open and the WHOLE inbound request blocks until the shared reverse proxy aborts it at ~120s → the mobile client sees **HTTP 502** with a Replit "couldn't reach this app" HTML page (looks like a server crash but isn't).

**Why:** the ROI "Run AI estimate" report (`pricing_mode:"ai"` → `computeAiRevenue`) and the valuation AI path both call these helpers; a slow web_search call produced repeated 120000ms `request aborted` (statusCode null) entries and a 502 in the app.

**How to apply:** both helpers wrap fetch in `fetchWithTimeout(url, init, timeoutMs)` (AbortController + clearTimeout). Defaults: Responses 45s (web_search legitimately takes 10–30s), chat 25s. The thrown timeout error is caught by the existing 3-level fallback (Responses → chat → heuristic), so a hung model now degrades to the deterministic heuristic instead of 502. Keep total worst-case (responses + chat) well under the 120s proxy cutoff. **Caveat:** dual-region runs `computeAiRevenue` TWICE sequentially — if both regions hit full timeouts that is 2×(45+25)=140s > 120s; if dual-region AI ever 502s, parallelize the two region calls or lower the ceilings.
