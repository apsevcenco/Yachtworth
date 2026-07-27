import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";
import { Platform } from "react-native";

export type SurveyVoiceLanguage = "en" | "fr" | "it" | "ru";

export type SurveyVoiceNoteResp = {
  id: string;
  field_key: string;
  language: SurveyVoiceLanguage;
  status: "completed" | "failed" | "processing" | "uploading" | "recording";
  audio_url?: string | null;
  text: string;
  raw_transcript: string;
  edited_text: string;
  confidence?: number | null;
  created_at?: string;
};

async function buildHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = await getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function appendAudioToFormData(
  form: FormData,
  uri: string,
  fileName: string,
) {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`Could not read recorded audio (HTTP ${res.status}).`);
    }
    const blob = await res.blob();
    form.append("file", blob, fileName);
    return;
  }

  form.append(
    "file",
    {
      uri,
      name: fileName,
      type: "audio/m4a",
    } as unknown as Blob,
  );
}

export async function uploadSurveyVoiceNote(input: {
  itemId: string;
  localUri: string;
  fieldKey: string;
  language: SurveyVoiceLanguage;
  durationSeconds?: number | null;
}): Promise<SurveyVoiceNoteResp> {
  const base = getBaseUrl() ?? "";
  const form = new FormData();
  const ext = Platform.OS === "web" ? "webm" : "m4a";
  await appendAudioToFormData(form, input.localUri, `voice_${Date.now()}.${ext}`);
  form.append("field_key", input.fieldKey);
  form.append("language", input.language);
  if (typeof input.durationSeconds === "number") {
    form.append("duration_seconds", String(input.durationSeconds));
  }

  const res = await fetch(`${base}/api/survey-items/${input.itemId}/voice-notes`, {
    method: "POST",
    headers: await buildHeaders(),
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Transcription failed (HTTP ${res.status}): ${text.slice(0, 240) || "no body"}`,
    );
  }
  return (await res.json()) as SurveyVoiceNoteResp;
}
