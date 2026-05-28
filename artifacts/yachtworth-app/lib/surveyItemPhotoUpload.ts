import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";
import { compressPhoto } from "./photoCompression";

/**
 * Survey item photo upload helper. Mirrors `lib/photoUpload.ts` — server
 * handles Supabase Storage via service-role so mobile never sees creds.
 */

export type UploadedItemPhoto = { url: string; photo_urls: string[] };
export type ItemPhotosResp = { photo_urls: string[] };

async function buildHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = await getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function uploadSurveyItemPhoto(
  itemId: string,
  localUri: string,
): Promise<UploadedItemPhoto> {
  const compressed = await compressPhoto(localUri);
  const base = getBaseUrl() ?? "";
  const url = `${base}/api/survey-items/${itemId}/photos`;
  const form = new FormData();
  form.append("file", {
    uri: compressed.uri,
    name: `photo_${Date.now()}.jpg`,
    type: "image/jpeg",
  } as unknown as Blob);

  const res = await fetch(url, {
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
  return (await res.json()) as UploadedItemPhoto;
}

export async function deleteSurveyItemPhoto(
  itemId: string,
  photoUrl: string,
): Promise<ItemPhotosResp> {
  const base = getBaseUrl() ?? "";
  const url = `${base}/api/survey-items/${itemId}/photos`;
  const headers = {
    ...(await buildHeaders()),
    "Content-Type": "application/json",
  };
  const res = await fetch(url, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ url: photoUrl }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Delete failed (HTTP ${res.status}): ${text.slice(0, 200) || "no body"}`,
    );
  }
  return (await res.json()) as ItemPhotosResp;
}
