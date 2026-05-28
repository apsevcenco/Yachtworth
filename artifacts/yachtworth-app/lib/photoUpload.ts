import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";
import { compressPhoto } from "./photoCompression";

/**
 * Yacht photo upload helper. Sends the compressed JPEG to
 * `POST /yachts/:id/photos` as multipart/form-data. The backend handles
 * the Supabase Storage upload via the service-role key so the mobile
 * app never sees storage credentials.
 *
 * Returns the updated yacht (with new photo_urls + cover_photo_url).
 */

export type UploadedYachtPhoto = {
  url: string;
  photo_urls: string[];
  cover_photo_url: string | null;
};

async function buildHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = await getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function uploadYachtPhoto(
  yachtId: string,
  localUri: string,
): Promise<UploadedYachtPhoto> {
  const compressed = await compressPhoto(localUri);

  const base = getBaseUrl() ?? "";
  const url = `${base}/api/yachts/${yachtId}/photos`;

  // React Native FormData accepts { uri, name, type } objects directly.
  const form = new FormData();
  const fileName = `photo_${Date.now()}.jpg`;
  form.append(
    "file",
    {
      uri: compressed.uri,
      name: fileName,
      type: "image/jpeg",
    } as unknown as Blob,
  );

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
  return (await res.json()) as UploadedYachtPhoto;
}

export async function deleteYachtPhoto(
  yachtId: string,
  photoUrl: string,
): Promise<UploadedYachtPhoto> {
  const base = getBaseUrl() ?? "";
  const url = `${base}/api/yachts/${yachtId}/photos`;
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
  return (await res.json()) as UploadedYachtPhoto;
}

export async function setCoverPhoto(
  yachtId: string,
  photoUrl: string,
): Promise<UploadedYachtPhoto> {
  const base = getBaseUrl() ?? "";
  const url = `${base}/api/yachts/${yachtId}/photos/cover`;
  const headers = {
    ...(await buildHeaders()),
    "Content-Type": "application/json",
  };
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ url: photoUrl }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Cover update failed (HTTP ${res.status}): ${text.slice(0, 200) || "no body"}`,
    );
  }
  return (await res.json()) as UploadedYachtPhoto;
}
