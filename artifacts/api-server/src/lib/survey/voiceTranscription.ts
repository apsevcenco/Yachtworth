const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TRANSCRIPTION_MODEL = "whisper-1";

export type SurveyVoiceLanguage = "en" | "fr" | "it" | "ru";

export const SURVEY_VOICE_LANGUAGES: SurveyVoiceLanguage[] = [
  "en",
  "fr",
  "it",
  "ru",
];

function getOpenAiBaseUrl(): string {
  const configured = process.env["OPENAI_BASE_URL"]?.trim();
  return configured || OPENAI_DEFAULT_BASE_URL;
}

function getOpenAiApiKey(): string | null {
  return (
    process.env["YACHTWORTH_OPENAI_API_KEY"]?.trim() ||
    process.env["OPENAI_API_KEY"]?.trim() ||
    null
  );
}

function getTranscriptionModel(): string {
  return (
    process.env["OPENAI_TRANSCRIPTION_MODEL"]?.trim() ||
    DEFAULT_TRANSCRIPTION_MODEL
  );
}

function cleanApiKeyLeak(message: string): string {
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***");
}

export async function transcribeSurveyVoiceNote(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  language: SurveyVoiceLanguage;
  signal?: AbortSignal;
}): Promise<{ text: string; language: SurveyVoiceLanguage; confidence: number | null }> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const form = new FormData();
  const bytes = new Uint8Array(input.buffer.byteLength);
  bytes.set(input.buffer);
  const blob = new Blob([bytes], {
    type: input.mimeType || "audio/m4a",
  });
  form.append("file", blob, input.fileName || "voice_note.m4a");
  form.append("model", getTranscriptionModel());
  form.append("language", input.language);
  form.append("response_format", "json");

  const response = await fetch(`${getOpenAiBaseUrl()}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: input.signal,
  });
  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const message =
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      parsed.error &&
      typeof parsed.error === "object" &&
      "message" in parsed.error &&
      typeof parsed.error.message === "string"
        ? parsed.error.message
        : raw.slice(0, 500) || `OpenAI transcription failed (${response.status})`;
    throw new Error(cleanApiKeyLeak(message));
  }
  const text =
    parsed &&
    typeof parsed === "object" &&
    "text" in parsed &&
    typeof parsed.text === "string"
      ? parsed.text.trim()
      : "";
  if (!text) {
    throw new Error("OpenAI transcription returned empty text.");
  }
  return { text, language: input.language, confidence: null };
}
