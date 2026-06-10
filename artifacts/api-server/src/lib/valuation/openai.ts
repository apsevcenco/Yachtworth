function getBaseUrl(): string {
  // User-provided keys go to the real OpenAI API. Only when falling back
  // to the Replit AI Integrations proxy do we use its base URL.
  if (process.env["YACHTWORTH_OPENAI_API_KEY"]) {
    return "https://api.openai.com/v1";
  }
  const url =
    process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] ||
    "https://api.openai.com/v1";
  return url.replace(/\/+$/, "");
}

function getApiKey(): string {
  const key =
    process.env["YACHTWORTH_OPENAI_API_KEY"] ||
    process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ||
    process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("OpenAI API key is not configured");
  return key;
}

// Default per-call ceilings. The shared reverse proxy aborts upstream requests
// at ~120s, so any single OpenAI call MUST resolve (or abort) well before that
// to leave room for the next fallback level (Responses → chat → heuristic).
const AI_CHAT_TIMEOUT_MS = 25_000;
// Real Charter ROI web_search runs ~9 search rounds and takes ~55s; 45s aborted
// them mid-search and forced a tool-less fallback. 95s lets the search complete
// while still finishing (or aborting → instant heuristic) under the ~120s proxy cap.
const AI_RESPONSES_TIMEOUT_MS = 95_000;

// fetch() never times out on its own; a hung OpenAI socket would block until the
// proxy kills the whole request at 120s → HTTP 502. AbortController converts a
// slow/hung call into a thrown error so the caller can fall back gracefully.
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`OpenAI request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function aiChat(
  messages: { role: string; content: string }[],
  model = "gpt-4o-mini",
  timeoutMs = AI_CHAT_TIMEOUT_MS,
): Promise<string> {
  const apiKey = getApiKey();
  const resp = await fetchWithTimeout(
    `${getBaseUrl()}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    },
    timeoutMs,
  );
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OpenAI chat ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function aiResponses(
  input: string,
  model = "gpt-4o-mini",
  tools?: unknown[],
  timeoutMs = AI_RESPONSES_TIMEOUT_MS,
  maxToolCalls?: number,
): Promise<string> {
  const apiKey = getApiKey();
  const body: Record<string, unknown> = { model, input };
  if (tools) body.tools = tools;
  if (maxToolCalls != null) body.max_tool_calls = maxToolCalls;
  const resp = await fetchWithTimeout(
    `${getBaseUrl()}/responses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OpenAI responses ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    output_text?: string;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  if (data.output_text) return data.output_text;
  const msg = data.output?.find((o) => o.type === "message");
  const txt = msg?.content?.find((c) => c.type === "output_text")?.text;
  return txt || "";
}

export function extractJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in AI response");
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }
  throw new Error("Unbalanced JSON in AI response");
}

export function cleanReasoning(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\(\[([^\]]+)\]\([^)]+\)\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}
