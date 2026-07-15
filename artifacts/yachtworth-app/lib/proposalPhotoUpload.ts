import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";
import { compressPhoto } from "./photoCompression";
import { appendPhotoToFormData } from "./photoFormData";

/**
 * Proposal photo upload helper. Manual proposals have no yacht row, so photos
 * are sent to `POST /proposals/photo` as multipart/form-data. The backend
 * uploads to the public `yacht-photos` bucket (under a `proposals/…` prefix)
 * via the service-role key and returns the public URL. The proposal screen
 * keeps the URL list + cover purely in local state / the snapshot jsonb —
 * delete and set-cover are local-only (no DB row to mutate).
 */

async function buildHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = await getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function uploadProposalPhoto(localUri: string): Promise<string> {
  const compressed = await compressPhoto(localUri);

  const base = getBaseUrl() ?? "";
  const url = `${base}/api/proposals/photo`;

  const form = new FormData();
  const fileName = `photo_${Date.now()}.jpg`;
  await appendPhotoToFormData(form, "file", compressed.uri, fileName);

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
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("Upload succeeded but no URL was returned.");
  return json.url;
}
