import type { Yacht } from "@workspace/api-client-react";

/**
 * Per-PDF spec weights. `brand` is treated as "Builder", `cabins` as "Guest
 * cabins", `engine_hours` as "Current engine hours". `notes` is a bonus field
 * (weight 0) so it doesn't penalize the score when empty.
 */
type FieldKey =
  | "name"
  | "yacht_type"
  | "year_built"
  | "length_meters"
  | "brand"
  | "flag"
  | "home_port"
  | "registration_number"
  | "imo_number"
  | "hull_id"
  | "vat_status"
  | "engine_maker"
  | "engine_count"
  | "total_hp"
  | "engine_hours"
  | "cabins"
  | "photo_url"
  | "notes";

export type CompletenessField = {
  key: FieldKey;
  weight: number;
  label: string;
};

export const COMPLETENESS_FIELDS: CompletenessField[] = [
  { key: "name", weight: 10, label: "Yacht name" },
  { key: "yacht_type", weight: 5, label: "Type" },
  { key: "year_built", weight: 5, label: "Year built" },
  { key: "length_meters", weight: 5, label: "Length" },
  { key: "brand", weight: 5, label: "Builder" },
  { key: "flag", weight: 5, label: "Flag" },
  { key: "home_port", weight: 5, label: "Home port" },
  { key: "registration_number", weight: 5, label: "Registration number" },
  { key: "imo_number", weight: 10, label: "IMO number" },
  { key: "hull_id", weight: 5, label: "Hull ID" },
  { key: "vat_status", weight: 5, label: "VAT status" },
  { key: "engine_maker", weight: 5, label: "Engine maker" },
  { key: "engine_count", weight: 5, label: "Engine count" },
  { key: "total_hp", weight: 5, label: "Horsepower" },
  { key: "engine_hours", weight: 5, label: "Current engine hours" },
  { key: "cabins", weight: 5, label: "Guest cabins" },
  { key: "photo_url", weight: 5, label: "Photo" },
  { key: "notes", weight: 0, label: "Notes" },
];

const TOTAL_WEIGHT = COMPLETENESS_FIELDS.reduce((s, f) => s + f.weight, 0);

const isFilled = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v) && v !== 0;
  return true;
};

export function calcCompleteness(yacht: Partial<Yacht> | null | undefined): number {
  if (!yacht) return 0;
  const filled = COMPLETENESS_FIELDS.reduce((s, f) => {
    const val = (yacht as Record<string, unknown>)[f.key];
    return s + (isFilled(val) ? f.weight : 0);
  }, 0);
  return Math.round((filled / TOTAL_WEIGHT) * 100);
}

export function nextSuggestedField(
  yacht: Partial<Yacht> | null | undefined,
): CompletenessField | null {
  if (!yacht) return COMPLETENESS_FIELDS[0] ?? null;
  return (
    COMPLETENESS_FIELDS.find((f) => {
      if (f.weight <= 0) return false;
      const val = (yacht as Record<string, unknown>)[f.key];
      return !isFilled(val);
    }) ?? null
  );
}

export function missingFields(
  yacht: Partial<Yacht> | null | undefined,
): CompletenessField[] {
  if (!yacht) return COMPLETENESS_FIELDS.filter((f) => f.weight > 0);
  return COMPLETENESS_FIELDS.filter((f) => {
    if (f.weight <= 0) return false;
    const val = (yacht as Record<string, unknown>)[f.key];
    return !isFilled(val);
  });
}
