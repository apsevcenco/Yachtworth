import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";
import { compressPhoto } from "./photoCompression";
import { appendPhotoToFormData } from "./photoFormData";

export type UploadedSurveyorLogo = { url: string };

async function buildHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = await getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function uploadSurveyorLogo(localUri: string): Promise<UploadedSurveyorLogo> {
  const compressed = await compressPhoto(localUri);
  const base = getBaseUrl() ?? "";
  const form = new FormData();
  await appendPhotoToFormData(
    form,
    "file",
    compressed.uri,
    `surveyor_logo_${Date.now()}.jpg`,
  );

  const res = await fetch(`${base}/api/surveyor-assets/logo`, {
    method: "POST",
    headers: await buildHeaders(),
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Upload failed (HTTP ${res.status}): ${text.slice(0, 200) || "no body"}`,
    );
  }
  return (await res.json()) as UploadedSurveyorLogo;
}
