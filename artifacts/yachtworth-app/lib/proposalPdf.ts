import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#081633";
const NAVY_ELEV = "#142A52";
const GOLD = "#C9A961";
const IVORY = "#F7F3EC";
const MUTED = "rgba(247,243,236,0.6)";
const DIVIDER = "rgba(247,243,236,0.1)";

export type ProposalLanguage =
  | "english"
  | "french"
  | "italian"
  | "spanish"
  | "german"
  | "russian";
export type ProposalType = "sale" | "charter" | "both";

export interface ProposalYachtSnapshot {
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
  registration_number?: string | null;
  imo_number?: string | null;
  hull_id?: string | null;
  vat_status?: string | null;
  photo_url?: string | null;
}

export interface ProposalEquipmentItem {
  category: string;
  equipment_type: string;
  brand?: string | null;
  model?: string | null;
  quantity?: number | null;
  power_kw?: number | null;
  power_hp?: number | null;
  capacity_liters?: number | null;
  capacity_persons?: number | null;
  total_watts?: number | null;
  year_installed?: number | null;
  notes?: string | null;
}

export interface ProposalSettings {
  proposal_type: ProposalType;
  language: ProposalLanguage;
  sections: string[];
  sale_price_eur?: number | null;
  charter_low_eur_week?: number | null;
  charter_high_eur_week?: number | null;
  charter_apa_pct?: number | null;
  charter_vat_pct?: number | null;
  broker_name?: string | null;
  broker_company?: string | null;
  broker_email?: string | null;
  broker_phone?: string | null;
  broker_website?: string | null;
}

export interface ProposalPdfInput {
  yacht: ProposalYachtSnapshot;
  equipment: ProposalEquipmentItem[];
  settings: ProposalSettings;
}

// --- Translations ---------------------------------------------------------

type L = ProposalLanguage;
type Dict = Record<string, Record<L, string>>;

const T: Dict = {
  proposal: {
    english: "Proposal",
    french: "Proposition",
    italian: "Proposta",
    spanish: "Propuesta",
    german: "Angebot",
    russian: "Предложение",
  },
  for_sale: {
    english: "For Sale",
    french: "À vendre",
    italian: "In vendita",
    spanish: "En venta",
    german: "Zum Verkauf",
    russian: "Продажа",
  },
  for_charter: {
    english: "For Charter",
    french: "En location",
    italian: "Per noleggio",
    spanish: "Para alquiler",
    german: "Für Charter",
    russian: "Аренда",
  },
  for_sale_and_charter: {
    english: "Sale & Charter",
    french: "Vente & location",
    italian: "Vendita & noleggio",
    spanish: "Venta y alquiler",
    german: "Verkauf & Charter",
    russian: "Продажа и аренда",
  },
  specifications: {
    english: "Specifications",
    french: "Caractéristiques",
    italian: "Specifiche",
    spanish: "Especificaciones",
    german: "Spezifikationen",
    russian: "Характеристики",
  },
  accommodation: {
    english: "Accommodation",
    french: "Hébergement",
    italian: "Alloggi",
    spanish: "Alojamiento",
    german: "Unterkunft",
    russian: "Размещение",
  },
  equipment: {
    english: "Equipment",
    french: "Équipement",
    italian: "Equipaggiamento",
    spanish: "Equipamiento",
    german: "Ausstattung",
    russian: "Оборудование",
  },
  pricing: {
    english: "Pricing",
    french: "Tarifs",
    italian: "Prezzi",
    spanish: "Precios",
    german: "Preise",
    russian: "Цены",
  },
  contact: {
    english: "Contact",
    french: "Contact",
    italian: "Contatto",
    spanish: "Contacto",
    german: "Kontakt",
    russian: "Контакт",
  },
  builder: {
    english: "Builder",
    french: "Constructeur",
    italian: "Cantiere",
    spanish: "Constructor",
    german: "Werft",
    russian: "Верфь",
  },
  model: {
    english: "Model",
    french: "Modèle",
    italian: "Modello",
    spanish: "Modelo",
    german: "Modell",
    russian: "Модель",
  },
  yacht_type: {
    english: "Type",
    french: "Type",
    italian: "Tipo",
    spanish: "Tipo",
    german: "Typ",
    russian: "Тип",
  },
  year_built: {
    english: "Year built",
    french: "Année",
    italian: "Anno",
    spanish: "Año",
    german: "Baujahr",
    russian: "Год постройки",
  },
  length: {
    english: "Length (LOA)",
    french: "Longueur",
    italian: "Lunghezza",
    spanish: "Eslora",
    german: "Länge",
    russian: "Длина",
  },
  beam: {
    english: "Beam",
    french: "Largeur",
    italian: "Larghezza",
    spanish: "Manga",
    german: "Breite",
    russian: "Ширина",
  },
  draft: {
    english: "Draft",
    french: "Tirant d'eau",
    italian: "Pescaggio",
    spanish: "Calado",
    german: "Tiefgang",
    russian: "Осадка",
  },
  flag: {
    english: "Flag",
    french: "Pavillon",
    italian: "Bandiera",
    spanish: "Bandera",
    german: "Flagge",
    russian: "Флаг",
  },
  home_port: {
    english: "Home port",
    french: "Port d'attache",
    italian: "Porto base",
    spanish: "Puerto base",
    german: "Heimathafen",
    russian: "Порт приписки",
  },
  imo: {
    english: "IMO",
    french: "IMO",
    italian: "IMO",
    spanish: "IMO",
    german: "IMO",
    russian: "IMO",
  },
  registration: {
    english: "Registration",
    french: "Immatriculation",
    italian: "Registrazione",
    spanish: "Matrícula",
    german: "Registrierung",
    russian: "Регистрация",
  },
  hull_id: {
    english: "Hull ID",
    french: "Coque ID",
    italian: "ID Scafo",
    spanish: "ID de casco",
    german: "Rumpf-ID",
    russian: "ID корпуса",
  },
  vat_status: {
    english: "VAT status",
    french: "Statut TVA",
    italian: "Stato IVA",
    spanish: "Estado IVA",
    german: "MwSt.-Status",
    russian: "Статус НДС",
  },
  engine: {
    english: "Engines",
    french: "Moteurs",
    italian: "Motori",
    spanish: "Motores",
    german: "Motoren",
    russian: "Двигатели",
  },
  engine_hours: {
    english: "Engine hours",
    french: "Heures moteur",
    italian: "Ore motore",
    spanish: "Horas motor",
    german: "Motorstunden",
    russian: "Часы двигателя",
  },
  power: {
    english: "Total power",
    french: "Puissance",
    italian: "Potenza",
    spanish: "Potencia",
    german: "Leistung",
    russian: "Мощность",
  },
  max_speed: {
    english: "Max speed",
    french: "Vitesse max",
    italian: "Velocità max",
    spanish: "Velocidad máx",
    german: "Max. Geschw.",
    russian: "Макс. скорость",
  },
  cruising_speed: {
    english: "Cruising speed",
    french: "Vitesse de croisière",
    italian: "Velocità di crociera",
    spanish: "Velocidad de crucero",
    german: "Reisegeschw.",
    russian: "Крейсерская",
  },
  range: {
    english: "Range",
    french: "Autonomie",
    italian: "Autonomia",
    spanish: "Autonomía",
    german: "Reichweite",
    russian: "Запас хода",
  },
  guests: {
    english: "Guests",
    french: "Invités",
    italian: "Ospiti",
    spanish: "Huéspedes",
    german: "Gäste",
    russian: "Гости",
  },
  cabins: {
    english: "Guest cabins",
    french: "Cabines invités",
    italian: "Cabine ospiti",
    spanish: "Cabinas",
    german: "Gästekabinen",
    russian: "Каюты",
  },
  crew: {
    english: "Crew",
    french: "Équipage",
    italian: "Equipaggio",
    spanish: "Tripulación",
    german: "Crew",
    russian: "Экипаж",
  },
  crew_cabins: {
    english: "Crew cabins",
    french: "Cabines équipage",
    italian: "Cabine equipaggio",
    spanish: "Cabinas tripulación",
    german: "Crew-Kabinen",
    russian: "Каюты экипажа",
  },
  berths: {
    english: "Berths",
    french: "Couchages",
    italian: "Posti letto",
    spanish: "Literas",
    german: "Schlafplätze",
    russian: "Спальных мест",
  },
  heads: {
    english: "Heads",
    french: "Salles d'eau",
    italian: "Bagni",
    spanish: "Baños",
    german: "Bäder",
    russian: "Санузлы",
  },
  asking_price: {
    english: "Asking price",
    french: "Prix demandé",
    italian: "Prezzo richiesto",
    spanish: "Precio solicitado",
    german: "Verkaufspreis",
    russian: "Запрашиваемая цена",
  },
  weekly_rate: {
    english: "Charter rate (per week)",
    french: "Tarif hebdo",
    italian: "Tariffa settimanale",
    spanish: "Tarifa semanal",
    german: "Wochencharter",
    russian: "Аренда в неделю",
  },
  per_week: {
    english: "/ week",
    french: "/ semaine",
    italian: "/ settimana",
    spanish: "/ semana",
    german: "/ Woche",
    russian: "/ неделя",
  },
  low_season: {
    english: "Low season",
    french: "Basse saison",
    italian: "Bassa stagione",
    spanish: "Temporada baja",
    german: "Nebensaison",
    russian: "Низкий сезон",
  },
  high_season: {
    english: "High season",
    french: "Haute saison",
    italian: "Alta stagione",
    spanish: "Temporada alta",
    german: "Hochsaison",
    russian: "Высокий сезон",
  },
  apa: {
    english: "APA (advance provisioning)",
    french: "APA",
    italian: "APA",
    spanish: "APA",
    german: "APA",
    russian: "APA (предоплата расходов)",
  },
  vat: {
    english: "VAT",
    french: "TVA",
    italian: "IVA",
    spanish: "IVA",
    german: "MwSt.",
    russian: "НДС",
  },
  disclaimer: {
    english:
      "Information provided in good faith — buyer/charterer must verify all details independently. Subject to prior sale, withdrawal or price change.",
    french:
      "Informations fournies de bonne foi — l'acheteur ou l'affréteur doit vérifier indépendamment. Sous réserve de vente, retrait ou modification de prix.",
    italian:
      "Informazioni fornite in buona fede — l'acquirente o l'affittuario deve verificare in modo indipendente. Soggetto a vendita, ritiro o modifica del prezzo.",
    spanish:
      "Información proporcionada de buena fe — el comprador o fletador debe verificar de forma independiente. Sujeto a venta, retirada o cambio de precio.",
    german:
      "Angaben in gutem Glauben — Käufer/Charterer müssen unabhängig prüfen. Vorbehaltlich vorherigem Verkauf, Rücknahme oder Preisänderung.",
    russian:
      "Информация предоставлена добросовестно — покупатель или арендатор должен проверять данные самостоятельно. Возможна предварительная продажа, отзыв или изменение цены.",
  },
  prepared_by: {
    english: "Prepared by",
    french: "Préparé par",
    italian: "Preparato da",
    spanish: "Preparado por",
    german: "Erstellt von",
    russian: "Подготовлено",
  },
  confidential: {
    english: "CONFIDENTIAL",
    french: "CONFIDENTIEL",
    italian: "RISERVATO",
    spanish: "CONFIDENCIAL",
    german: "VERTRAULICH",
    russian: "КОНФИДЕНЦИАЛЬНО",
  },
  document_date: {
    english: "Document date",
    french: "Date du document",
    italian: "Data documento",
    spanish: "Fecha del documento",
    german: "Dokumentdatum",
    russian: "Дата документа",
  },
};

const EQUIPMENT_GROUPS: Record<
  string,
  Record<L, string>
> = {
  power: {
    english: "Power & Electrical",
    french: "Énergie & électricité",
    italian: "Energia & elettrico",
    spanish: "Energía y eléctrico",
    german: "Strom & Elektrik",
    russian: "Электроснабжение",
  },
  water: {
    english: "Water & Plumbing",
    french: "Eau & plomberie",
    italian: "Acqua & impianti",
    spanish: "Agua y fontanería",
    german: "Wasser & Sanitär",
    russian: "Вода и сантехника",
  },
  navigation: {
    english: "Navigation & Communications",
    french: "Navigation & communications",
    italian: "Navigazione & comunicazioni",
    spanish: "Navegación y comunicaciones",
    german: "Navigation & Kommunikation",
    russian: "Навигация и связь",
  },
  safety: {
    english: "Safety",
    french: "Sécurité",
    italian: "Sicurezza",
    spanish: "Seguridad",
    german: "Sicherheit",
    russian: "Безопасность",
  },
  comfort: {
    english: "Comfort & Climate",
    french: "Confort & climat",
    italian: "Comfort & clima",
    spanish: "Confort y clima",
    german: "Komfort & Klima",
    russian: "Комфорт и климат",
  },
  toys: {
    english: "Toys & Tenders",
    french: "Annexes & jouets",
    italian: "Toys & tender",
    spanish: "Tenders y juguetes",
    german: "Spielzeug & Beiboote",
    russian: "Тендеры и игрушки",
  },
  deck: {
    english: "Deck & Exterior",
    french: "Pont & extérieur",
    italian: "Coperta & esterno",
    spanish: "Cubierta y exterior",
    german: "Deck & Außen",
    russian: "Палуба и экстерьер",
  },
  sailing: {
    english: "Sailing",
    french: "Voile",
    italian: "Vela",
    spanish: "Vela",
    german: "Segeln",
    russian: "Парусное",
  },
};

function t(key: keyof typeof T, lang: L): string {
  return T[key]?.[lang] ?? T[key]?.english ?? key;
}

function tGroup(category: string, lang: L): string {
  const g = EQUIPMENT_GROUPS[category];
  if (!g) return humanize(category);
  return g[lang] ?? g.english;
}

// --- helpers --------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEur(n: number): string {
  return "€ " + Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
}

function proposalTypeLabel(p: ProposalType, lang: L): string {
  if (p === "sale") return t("for_sale", lang);
  if (p === "charter") return t("for_charter", lang);
  return t("for_sale_and_charter", lang);
}

function dateLocale(lang: L): string {
  switch (lang) {
    case "french":
      return "fr-FR";
    case "italian":
      return "it-IT";
    case "spanish":
      return "es-ES";
    case "german":
      return "de-DE";
    case "russian":
      return "ru-RU";
    default:
      return "en-GB";
  }
}

function row(label: string, value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

// --- equipment rendering --------------------------------------------------

function equipmentLine(it: ProposalEquipmentItem): string {
  const head = humanize(it.equipment_type);
  const meta: string[] = [];
  if (it.brand) meta.push(it.brand);
  if (it.model) meta.push(it.model);
  if (it.quantity && it.quantity > 1) meta.push(`×${it.quantity}`);
  if (it.power_kw) meta.push(`${it.power_kw} kW`);
  if (it.power_hp) meta.push(`${it.power_hp} HP`);
  if (it.capacity_liters) meta.push(`${it.capacity_liters} L`);
  if (it.capacity_persons) meta.push(`${it.capacity_persons} pax`);
  if (it.total_watts) meta.push(`${it.total_watts} W`);
  if (it.year_installed) meta.push(String(it.year_installed));
  const metaHtml = meta.length
    ? `<span class="eq-meta">${escapeHtml(meta.join(" · "))}</span>`
    : "";
  return `<li><span class="eq-head">${escapeHtml(head)}</span>${metaHtml}</li>`;
}

function groupEquipment(
  items: ProposalEquipmentItem[],
): Map<string, ProposalEquipmentItem[]> {
  const m = new Map<string, ProposalEquipmentItem[]>();
  for (const it of items) {
    const arr = m.get(it.category) ?? [];
    arr.push(it);
    m.set(it.category, arr);
  }
  return m;
}

// --- main builder ---------------------------------------------------------

export function buildProposalPdfHtml(input: ProposalPdfInput): string {
  const { yacht, equipment, settings } = input;
  const lang = settings.language;
  const today = new Date().toLocaleDateString(dateLocale(lang), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const includes = new Set(settings.sections ?? []);
  const watermark = includes.has("watermark_confidential");

  // ---- cover ----
  const subtitleParts = [
    yacht.builder,
    yacht.model,
    yacht.yacht_type ? humanize(yacht.yacht_type) : null,
    yacht.year_built ? String(yacht.year_built) : null,
    yacht.length_meters ? `${yacht.length_meters.toFixed(1)} m` : null,
  ].filter(Boolean) as string[];
  const heroPhoto = yacht.photo_url
    ? `<div class="cover-photo" style="background-image:url('${escapeAttr(yacht.photo_url)}')"></div>`
    : `<div class="cover-photo placeholder"><span>⚓</span></div>`;
  const cover = `
    <section class="page cover">
      ${watermark ? `<div class="watermark">${escapeHtml(t("confidential", lang))}</div>` : ""}
      <div class="cover-top">
        <div class="brand">YACHTWORTH</div>
        <div class="gold-line"></div>
        <div class="proposal-label">${escapeHtml(t("proposal", lang))} · ${escapeHtml(proposalTypeLabel(settings.proposal_type, lang))}</div>
      </div>
      ${heroPhoto}
      <div class="cover-bottom">
        <h1>${escapeHtml(yacht.name)}</h1>
        ${subtitleParts.length ? `<div class="cover-sub">${escapeHtml(subtitleParts.join(" · "))}</div>` : ""}
        <div class="cover-date">${escapeHtml(t("document_date", lang))}: ${escapeHtml(today)}</div>
      </div>
    </section>`;

  // ---- specs + accommodation ----
  const specRows = [
    row(t("builder", lang), yacht.builder ?? null),
    row(t("model", lang), yacht.model ?? null),
    row(t("yacht_type", lang), yacht.yacht_type ? humanize(yacht.yacht_type) : null),
    row(t("year_built", lang), yacht.year_built ? String(yacht.year_built) : null),
    row(t("length", lang), yacht.length_meters ? `${yacht.length_meters.toFixed(2)} m` : null),
    row(t("beam", lang), yacht.beam_meters ? `${yacht.beam_meters.toFixed(2)} m` : null),
    row(t("draft", lang), yacht.draft_meters ? `${yacht.draft_meters.toFixed(2)} m` : null),
    row(t("flag", lang), yacht.flag ?? null),
    row(t("home_port", lang), yacht.home_port ?? null),
    row(t("registration", lang), yacht.registration_number ?? null),
    row(t("imo", lang), yacht.imo_number ?? null),
    row(t("hull_id", lang), yacht.hull_id ?? null),
    row(t("vat_status", lang), yacht.vat_status ? humanize(yacht.vat_status) : null),
    row(
      t("engine", lang),
      [yacht.engine_count ? `${yacht.engine_count}×` : null, yacht.engine_maker, yacht.engine_model]
        .filter(Boolean)
        .join(" ") || null,
    ),
    row(t("power", lang), yacht.total_hp ? `${yacht.total_hp} HP` : null),
    row(t("engine_hours", lang), yacht.engine_hours != null ? `${yacht.engine_hours} h` : null),
    row(t("max_speed", lang), yacht.max_speed_knots ? `${yacht.max_speed_knots} kn` : null),
    row(t("cruising_speed", lang), yacht.cruising_speed_knots ? `${yacht.cruising_speed_knots} kn` : null),
    row(t("range", lang), yacht.range_nm ? `${yacht.range_nm} nm` : null),
  ]
    .filter(Boolean)
    .join("");

  const accomRows = [
    row(t("guests", lang), yacht.guests != null ? String(yacht.guests) : null),
    row(t("cabins", lang), yacht.cabins != null ? String(yacht.cabins) : null),
    row(t("berths", lang), yacht.berths != null ? String(yacht.berths) : null),
    row(t("heads", lang), yacht.heads != null ? String(yacht.heads) : null),
    row(t("crew", lang), yacht.crew != null ? String(yacht.crew) : null),
    row(t("crew_cabins", lang), yacht.crew_cabins != null ? String(yacht.crew_cabins) : null),
  ]
    .filter(Boolean)
    .join("");

  const specPage = `
    <section class="page">
      ${watermark ? `<div class="watermark">${escapeHtml(t("confidential", lang))}</div>` : ""}
      <div class="page-head">
        <div class="brand small">YACHTWORTH</div>
        <div class="page-title">${escapeHtml(yacht.name)}</div>
      </div>
      <div class="gold-line"></div>
      <h2>${escapeHtml(t("specifications", lang))}</h2>
      ${specRows ? `<table class="kv"><tbody>${specRows}</tbody></table>` : `<p class="empty">—</p>`}
      ${accomRows
        ? `<h2 class="mt">${escapeHtml(t("accommodation", lang))}</h2>
           <table class="kv"><tbody>${accomRows}</tbody></table>`
        : ""}
    </section>`;

  // ---- equipment (always rendered to guarantee 4-page output) ----
  let equipBody = `<p class="empty">—</p>`;
  if (includes.has("equipment") && equipment.length > 0) {
    const groups = groupEquipment(equipment);
    const order = ["power", "water", "navigation", "safety", "comfort", "toys", "deck", "sailing"];
    const blocks: string[] = [];
    for (const cat of order) {
      const list = groups.get(cat);
      if (!list || list.length === 0) continue;
      blocks.push(
        `<div class="eq-group"><h3>${escapeHtml(tGroup(cat, lang))}</h3><ul class="eq-list">${list.map(equipmentLine).join("")}</ul></div>`,
      );
    }
    for (const [cat, list] of groups.entries()) {
      if (order.includes(cat)) continue;
      blocks.push(
        `<div class="eq-group"><h3>${escapeHtml(tGroup(cat, lang))}</h3><ul class="eq-list">${list.map(equipmentLine).join("")}</ul></div>`,
      );
    }
    if (blocks.length) equipBody = `<div class="eq-grid">${blocks.join("")}</div>`;
  }
  const equipPage = `
      <section class="page">
        ${watermark ? `<div class="watermark">${escapeHtml(t("confidential", lang))}</div>` : ""}
        <div class="page-head">
          <div class="brand small">YACHTWORTH</div>
          <div class="page-title">${escapeHtml(yacht.name)}</div>
        </div>
        <div class="gold-line"></div>
        <h2>${escapeHtml(t("equipment", lang))}</h2>
        ${equipBody}
      </section>`;

  // ---- pricing + contact ----
  const priceLines: string[] = [];
  const wantSale =
    (settings.proposal_type === "sale" || settings.proposal_type === "both") &&
    includes.has("pricing_sale");
  const wantCharter =
    (settings.proposal_type === "charter" || settings.proposal_type === "both") &&
    includes.has("pricing_charter");
  if (wantSale && settings.sale_price_eur != null) {
    priceLines.push(
      `<div class="price-row"><span class="k">${escapeHtml(t("asking_price", lang))}</span><span class="v">${escapeHtml(formatEur(settings.sale_price_eur))}</span></div>`,
    );
  }
  if (wantCharter) {
    if (settings.charter_low_eur_week != null) {
      priceLines.push(
        `<div class="price-row"><span class="k">${escapeHtml(t("low_season", lang))}</span><span class="v">${escapeHtml(formatEur(settings.charter_low_eur_week))} ${escapeHtml(t("per_week", lang))}</span></div>`,
      );
    }
    if (settings.charter_high_eur_week != null) {
      priceLines.push(
        `<div class="price-row"><span class="k">${escapeHtml(t("high_season", lang))}</span><span class="v">${escapeHtml(formatEur(settings.charter_high_eur_week))} ${escapeHtml(t("per_week", lang))}</span></div>`,
      );
    }
    if (settings.charter_apa_pct != null) {
      priceLines.push(
        `<div class="price-row"><span class="k">${escapeHtml(t("apa", lang))}</span><span class="v">${settings.charter_apa_pct}%</span></div>`,
      );
    }
    if (settings.charter_vat_pct != null) {
      priceLines.push(
        `<div class="price-row"><span class="k">${escapeHtml(t("vat", lang))}</span><span class="v">${settings.charter_vat_pct}%</span></div>`,
      );
    }
  }

  const contactLines: string[] = [];
  if (settings.broker_name) contactLines.push(escapeHtml(settings.broker_name));
  if (settings.broker_company) contactLines.push(escapeHtml(settings.broker_company));
  if (settings.broker_email) contactLines.push(escapeHtml(settings.broker_email));
  if (settings.broker_phone) contactLines.push(escapeHtml(settings.broker_phone));
  if (settings.broker_website) contactLines.push(escapeHtml(settings.broker_website));
  const wantContact = includes.has("contact") && contactLines.length > 0;

  // back page is always rendered to guarantee 4-page output
  const backPage = `
      <section class="page">
        ${watermark ? `<div class="watermark">${escapeHtml(t("confidential", lang))}</div>` : ""}
        <div class="page-head">
          <div class="brand small">YACHTWORTH</div>
          <div class="page-title">${escapeHtml(yacht.name)}</div>
        </div>
        <div class="gold-line"></div>
        <h2>${escapeHtml(t("pricing", lang))}</h2>
        ${priceLines.length
          ? `<div class="prices">${priceLines.join("")}</div>`
          : `<p class="empty">—</p>`}
        <h2 class="mt">${escapeHtml(t("contact", lang))}</h2>
        ${wantContact
          ? `<div class="contact-card">
               <div class="contact-kicker">${escapeHtml(t("prepared_by", lang))}</div>
               ${contactLines.map((l) => `<div class="contact-line">${l}</div>`).join("")}
             </div>`
          : `<p class="empty">—</p>`}
        <div class="disclaimer">${escapeHtml(t("disclaimer", lang))}</div>
        <div class="footer-brand">YACHTWORTH · Powered by PDYE Group</div>
      </section>`;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>${escapeAttr(yacht.name)} — ${escapeAttr(t("proposal", lang))}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${NAVY}; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${IVORY};
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page {
    position: relative;
    width: 210mm; min-height: 297mm;
    padding: 22mm 18mm;
    background: ${NAVY};
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }
  .watermark {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-28deg);
    font-size: 72px; font-weight: 800; letter-spacing: 10px;
    color: rgba(201,169,97,0.07); pointer-events: none;
    text-align: center; white-space: nowrap;
  }
  .brand { color: ${GOLD}; font-size: 14px; letter-spacing: 6px; font-weight: 700; }
  .brand.small { font-size: 10px; letter-spacing: 4px; }
  .gold-line { height: 2px; background: ${GOLD}; margin: 10px 0 18px; }

  /* cover */
  .cover { display: flex; flex-direction: column; }
  .cover-top { margin-bottom: 18px; }
  .proposal-label {
    color: ${IVORY}; font-size: 11px; letter-spacing: 3px;
    text-transform: uppercase; font-weight: 600;
  }
  .cover-photo {
    flex: 1; min-height: 360px; border-radius: 14px;
    background-size: cover; background-position: center;
    background-color: ${NAVY_ELEV};
    border: 1px solid ${DIVIDER};
    margin: 12px 0 22px;
    display: flex; align-items: center; justify-content: center;
  }
  .cover-photo.placeholder span { color: ${GOLD}; font-size: 80px; }
  .cover-bottom h1 {
    color: ${IVORY}; font-size: 44px; line-height: 1.05;
    margin: 0 0 8px; font-weight: 800; letter-spacing: -0.6px;
  }
  .cover-sub { color: ${MUTED}; font-size: 14px; margin-bottom: 16px; }
  .cover-date { color: ${GOLD}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }

  /* interior page head */
  .page-head { display: flex; justify-content: space-between; align-items: baseline; }
  .page-title { color: ${IVORY}; font-size: 13px; font-weight: 600; opacity: 0.85; }

  h2 {
    color: ${GOLD}; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;
    margin: 0 0 12px; font-weight: 700;
  }
  h2.mt { margin-top: 22px; }
  h3 {
    color: ${IVORY}; font-size: 13px; margin: 0 0 8px; font-weight: 700;
  }

  table.kv {
    width: 100%; border-collapse: collapse;
    background: ${NAVY_DEEP}; border-radius: 10px; overflow: hidden;
    border: 1px solid ${DIVIDER};
  }
  table.kv th, table.kv td {
    text-align: left; padding: 10px 14px; font-size: 12px;
    border-bottom: 1px solid ${DIVIDER}; vertical-align: top;
  }
  table.kv tr:last-child th, table.kv tr:last-child td { border-bottom: 0; }
  table.kv th { color: ${GOLD}; font-weight: 600; width: 40%; }
  table.kv td { color: ${IVORY}; }

  .eq-grid { display: block; }
  .eq-group {
    background: ${NAVY_DEEP}; border: 1px solid ${DIVIDER};
    border-radius: 10px; padding: 12px 16px; margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .eq-list { list-style: none; margin: 6px 0 0; padding: 0; }
  .eq-list li {
    padding: 4px 0; font-size: 11.5px; color: ${IVORY};
    border-bottom: 1px solid ${DIVIDER};
  }
  .eq-list li:last-child { border-bottom: 0; }
  .eq-head { font-weight: 600; }
  .eq-meta { color: ${MUTED}; margin-left: 8px; font-size: 10.5px; }

  .prices {
    background: ${NAVY_ELEV}; border-radius: 12px;
    padding: 16px 18px; border: 1px solid rgba(201,169,97,0.25);
  }
  .price-row {
    display: flex; justify-content: space-between;
    margin: 6px 0; font-size: 13px;
  }
  .price-row .k { color: ${GOLD}; font-weight: 600; }
  .price-row .v { color: ${IVORY}; font-weight: 700; }

  .contact-card {
    background: ${NAVY_DEEP}; border: 1px solid ${DIVIDER};
    border-radius: 12px; padding: 16px 18px;
  }
  .contact-kicker {
    color: ${GOLD}; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 8px;
  }
  .contact-line { color: ${IVORY}; font-size: 12.5px; line-height: 1.7; }

  .disclaimer {
    margin-top: 22px; color: ${MUTED}; font-size: 9.5px;
    line-height: 1.55; font-style: italic;
  }
  .footer-brand {
    margin-top: 16px; padding-top: 12px; border-top: 1px solid ${DIVIDER};
    color: ${GOLD}; font-size: 10px; letter-spacing: 3px; text-align: center;
  }
  .empty { color: ${MUTED}; font-size: 12px; }
</style></head><body>
  ${cover}
  ${specPage}
  ${equipPage}
  ${backPage}
</body></html>`;
}

export async function exportProposalPdf(
  input: ProposalPdfInput,
): Promise<void> {
  const html = buildProposalPdfHtml(input);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Save ${input.yacht.name} proposal`,
      UTI: "com.adobe.pdf",
    });
  }
}
