function getBaseUrl(): string {
  const url =
    process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] || "https://api.openai.com/v1";
  return url.replace(/\/+$/, "");
}

function getApiKey(): string {
  const key =
    process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ||
    process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("OpenAI API key is not configured");
  return key;
}

export async function aiChat(
  messages: { role: string; content: string }[],
  model = "gpt-5-mini",
): Promise<string> {
  const apiKey = getApiKey();
  const resp = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });
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
  model = "gpt-5-mini",
  tools?: unknown[],
): Promise<string> {
  const apiKey = getApiKey();
  const body: Record<string, unknown> = { model, input };
  if (tools) body.tools = tools;
  const resp = await fetch(`${getBaseUrl()}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
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
