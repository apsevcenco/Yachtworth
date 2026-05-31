import { getAuthToken, getBaseUrl } from "@workspace/api-client-react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type {
  ProposalEquipmentItem,
  ProposalSettings,
  ProposalYachtSnapshot,
} from "./proposalPdf";

/**
 * Backend Document Generation Engine client (additive — independent from the
 * client-side "Legacy" `exportProposalPdf`). Calls `POST /api/documents/generate`
 * and downloads the returned PDF/DOCX file.
 */

export type DocumentFormat = "pdf" | "docx";

type BackendTemplate = "minimal" | "classic" | "premium";

function mapTemplate(t: ProposalSettings["template"]): BackendTemplate {
  if (t === "classic") return "classic";
  if (t === "dark") return "premium";
  return "minimal";
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out +=
      chars[(n >> 18) & 63] +
      chars[(n >> 12) & 63] +
      chars[(n >> 6) & 63] +
      chars[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i]! << 16;
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + "==";
  } else if (rem === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + "=";
  }
  return out;
}

function buildRequestBody(
  yacht: ProposalYachtSnapshot,
  equipment: ProposalEquipmentItem[],
  settings: ProposalSettings,
  format: DocumentFormat,
) {
  return {
    documentType: "proposal" as const,
    format,
    template: mapTemplate(settings.template),
    yachtProfile: yacht,
    reportData: {
      equipment,
      proposal_type: settings.proposal_type,
      sale_price_eur: settings.sale_price_eur ?? null,
      charter_low_eur_week: settings.charter_low_eur_week ?? null,
      charter_high_eur_week: settings.charter_high_eur_week ?? null,
      charter_apa_pct: settings.charter_apa_pct ?? null,
      charter_vat_pct: settings.charter_vat_pct ?? null,
      price_on_application: settings.price_on_application ?? null,
      charter_on_application: settings.charter_on_application ?? null,
      delivery: settings.delivery ?? null,
      sea_trial: settings.sea_trial ?? null,
      charter_area: settings.charter_area ?? null,
      myba_contract: settings.myba_contract ?? null,
      notes: settings.notes ?? null,
      broker_name: settings.broker_name ?? null,
      broker_company: settings.broker_company ?? null,
      broker_email: settings.broker_email ?? null,
      broker_phone: settings.broker_phone ?? null,
      broker_website: settings.broker_website ?? null,
    },
    exportSettings: {
      template: mapTemplate(settings.template),
      language: settings.language,
      sections: settings.sections,
      confidential: Array.isArray(settings.sections)
        ? settings.sections.includes("watermark_confidential")
        : false,
      // Proposal V2 (adaptive PDF engine) is opt-in. Enable it ONLY for the
      // Professional PDF export. DOCX must stay on the legacy backend path.
      ...(format === "pdf" ? { engine: "adaptive" as const } : {}),
    },
  };
}

function fileNameFor(yacht: ProposalYachtSnapshot, format: DocumentFormat): string {
  const base =
    (yacht.name || "proposal")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "proposal";
  return `${base}_proposal.${format}`;
}

/**
 * Generate a professional proposal document on the backend and present it
 * (share sheet on native, download on web).
 */
export async function exportProposalDocument(input: {
  yacht: ProposalYachtSnapshot;
  equipment: ProposalEquipmentItem[];
  settings: ProposalSettings;
  format: DocumentFormat;
}): Promise<void> {
  const { yacht, equipment, settings, format } = input;
  const base = getBaseUrl() ?? "";
  const url = `${base}/api/documents/generate`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept:
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(buildRequestBody(yacht, equipment, settings, format)),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      detail = j?.error ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(
      `Export failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const fileName = fileNameFor(yacht, format);
  const mime =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (Platform.OS === "web") {
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    return;
  }

  const buf = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buf);
  const fileUri = `${FileSystem.cacheDirectory ?? ""}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: mime,
      dialogTitle: fileName,
      UTI: format === "pdf" ? "com.adobe.pdf" : "org.openxmlformats.wordprocessingml.document",
    });
  }
}
