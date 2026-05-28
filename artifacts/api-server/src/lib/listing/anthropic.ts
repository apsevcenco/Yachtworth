function getBaseUrl(): string {
  const url =
    process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"] ||
    "https://api.anthropic.com";
  return url.replace(/\/+$/, "");
}

function getApiKey(): string | null {
  return (
    process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"] ||
    process.env["ANTHROPIC_API_KEY"] ||
    null
  );
}

export function isAnthropicConfigured(): boolean {
  return !!getApiKey();
}

export interface AnthropicMessageOptions {
  model?: string;
  maxTokens?: number;
  system: string;
  userContent: string;
}

export async function anthropicMessage(
  opts: AnthropicMessageOptions,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Anthropic API key is not configured");
  const model = opts.model ?? "claude-sonnet-4-6";
  const body = {
    model,
    max_tokens: opts.maxTokens ?? 1000,
    system: opts.system,
    messages: [{ role: "user", content: opts.userContent }],
  };
  const resp = await fetch(`${getBaseUrl()}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Anthropic ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (data.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!.trim())
    .join("\n\n")
    .trim();
  return text;
}
