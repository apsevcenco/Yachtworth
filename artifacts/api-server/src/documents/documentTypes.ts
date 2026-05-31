/**
 * Shared types for the universal Document Generation Engine.
 *
 * Design principle (do NOT duplicate yacht data in every tool):
 *   - yachtProfile   = shared yacht data (specs, photos)
 *   - reportData     = tool-specific content (for proposals: equipment + pricing + broker)
 *   - exportSettings = template, language, branding, output format
 *
 * The engine is intentionally additive and independent from the existing
 * Expo client-side ("Legacy") proposal PDF generator.
 */

export type DocumentType = "proposal";
export type DocumentFormat = "pdf" | "docx";

/** Backend template set. `dark` from the legacy client maps to `premium`. */
export type DocumentTemplate = "minimal" | "classic" | "premium";

export type ProposalLanguage =
  | "english"
  | "french"
  | "italian"
  | "spanish"
  | "german"
  | "russian";

export type ProposalType = "sale" | "charter" | "both";

export interface YachtProfile {
  name: string;
  builder?: string | null;
  model?: string | null;
  yacht_type?: string | null;
  year_built?: number | null;
  length_meters?: number | null;
  beam_meters?: number | null;
  draft_meters?: number | null;
  flag?: string | null;
  home_port?: string | null;
  cabins?: number | null;
  guests?: number | null;
  crew?: number | null;
  berths?: number | null;
  heads?: number | null;
  crew_cabins?: number | null;
  engine_maker?: string | null;
  engine_model?: string | null;
  engine_count?: number | null;
  total_hp?: number | null;
  engine_hours?: number | null;
  max_speed_knots?: number | null;
  cruising_speed_knots?: number | null;
  range_nm?: number | null;
  fuel_capacity_l?: number | null;
  hull_material?: string | null;
  hull_type?: string | null;
  registration_number?: string | null;
  imo_number?: string | null;
  hull_id?: string | null;
  vat_status?: string | null;
  photo_url?: string | null;
  photo_urls?: string[] | null;
  cover_photo_url?: string | null;
}

export interface ProposalEquipmentItem {
  category?: string | null;
  equipment_type?: string | null;
  brand?: string | null;
  model?: string | null;
  quantity?: number | null;
  power_kw?: number | null;
  power_hp?: number | null;
  capacity_liters?: number | null;
  capacity_persons?: number | null;
  total_watts?: number | null;
  year_installed?: number | null;
  hours?: number | null;
  notes?: string | null;
}

/** Proposal-specific content (NOT yacht specs). */
export interface ProposalReportData {
  equipment?: ProposalEquipmentItem[];
  proposal_type?: ProposalType;
  sale_price_eur?: number | null;
  charter_low_eur_week?: number | null;
  charter_high_eur_week?: number | null;
  charter_apa_pct?: number | null;
  charter_vat_pct?: number | null;
  price_on_application?: boolean | null;
  charter_on_application?: boolean | null;
  delivery?: string | null;
  sea_trial?: string | null;
  charter_area?: string | null;
  myba_contract?: boolean | null;
  notes?: string | null;
  broker_name?: string | null;
  broker_company?: string | null;
  broker_email?: string | null;
  broker_phone?: string | null;
  broker_website?: string | null;
}

export interface ExportSettings {
  template?: DocumentTemplate;
  language?: ProposalLanguage;
  /** Optional list of section ids to include; empty/undefined = all default sections. */
  sections?: string[];
  confidential?: boolean;
  /** Branding overrides (optional; defaults to Yachtworth navy/gold). */
  brand_name?: string | null;
  accent_color?: string | null;
}

export interface GenerateDocumentRequest {
  documentType: DocumentType;
  format: DocumentFormat;
  template?: DocumentTemplate;
  yachtProfile: YachtProfile;
  reportData?: ProposalReportData;
  exportSettings?: ExportSettings;
}

export interface GeneratedDocument {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

export const PDF_CONTENT_TYPE = "application/pdf";
export const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Normalise any incoming template value (incl. legacy `dark`) to the backend set. */
export function normalizeTemplate(t: unknown): DocumentTemplate {
  if (t === "classic") return "classic";
  if (t === "premium" || t === "dark") return "premium";
  return "minimal";
}
