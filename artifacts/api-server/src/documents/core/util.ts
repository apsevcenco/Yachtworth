/** Shared, framework-free helpers for the adaptive document engine. */

import type { YachtProfile } from "../documentTypes";

/** HTML-escape any value for safe interpolation into a template string. */
export function esc(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Coerce to a finite number or null. */
export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Only https URLs are allowed as image sources (matches legacy templates). */
export function isHttps(u: unknown): u is string {
  return typeof u === "string" && /^https:\/\//i.test(u);
}

/** Ordered, de-duplicated list of usable (https) yacht photo URLs. */
export function photoList(y: YachtProfile): string[] {
  const out: string[] = [];
  if (isHttps(y.cover_photo_url)) out.push(y.cover_photo_url);
  if (Array.isArray(y.photo_urls)) {
    for (const p of y.photo_urls) if (isHttps(p) && !out.includes(p)) out.push(p);
  }
  if (isHttps(y.photo_url) && !out.includes(y.photo_url)) out.push(y.photo_url);
  return out;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
