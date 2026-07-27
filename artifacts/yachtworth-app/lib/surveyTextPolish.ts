import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";

export type SurveyPolishMode = "note" | "finding" | "recommendation";

export type SurveyPolishResponse = {
  field_key: string;
  mode: SurveyPolishMode;
  original_text: string;
  polished_text: string;
  recommendation_level?: "A" | "B" | "C" | "D" | null;
  confidence?: "low" | "medium" | "high";
};

async function buildHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = await getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function polishSurveyText(input: {
  itemId: string;
  text: string;
  fieldKey: string;
  mode: SurveyPolishMode;
  language?: string;
}): Promise<SurveyPolishResponse> {
  const base = getBaseUrl() ?? "";
  const res = await fetch(`${base}/api/survey-items/${input.itemId}/text-polish`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify({
      text: input.text,
      field_key: input.fieldKey,
      mode: input.mode,
      language: input.language,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `AI polish failed (HTTP ${res.status}): ${text.slice(0, 240) || "no body"}`,
    );
  }
  return (await res.json()) as SurveyPolishResponse;
}
