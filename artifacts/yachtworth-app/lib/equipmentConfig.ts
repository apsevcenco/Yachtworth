import type { EquipmentItem } from "@workspace/api-client-react";

/**
 * Declarative catalog for the Equipment & Systems section. One source of
 * truth used by the editor, the overview display, and the completeness
 * scoring helper. Each item carries a stable `equipment_type` key that is
 * persisted in the DB row — keep keys stable across releases.
 */

export type EquipmentFieldKind =
  | "text"
  | "number"
  | "integer"
  | "select"
  | "stepper";

export type EquipmentField = {
  key: keyof EquipmentItem;
  kind: EquipmentFieldKind;
  label: string;
  suffix?: string;
  placeholder?: string;
  options?: string[]; // for kind: "select"
  multiline?: boolean;
  min?: number;
  max?: number;
};

export type EquipmentDef = {
  key: string; // equipment_type
  label: string;
  /** "toggle" = on/off single row; "multi" = list of entries with Add button */
  kind: "toggle" | "multi";
  maxUnits?: number; // for multi
  fields: EquipmentField[];
};

export type EquipmentGroup = {
  category: EquipmentItem["category"];
  label: string;
  items: EquipmentDef[];
  /** If set, group only renders when yacht_type matches one of these values */
  yachtTypes?: string[];
};

// ── Field shorthands ──────────────────────────────────────────────────
const BRAND: EquipmentField = { key: "brand", kind: "text", label: "Brand" };
const MODEL: EquipmentField = { key: "model", kind: "text", label: "Model" };
const SERIAL: EquipmentField = {
  key: "serial_number",
  kind: "text",
  label: "Serial number",
};
const YEAR: EquipmentField = {
  key: "year_installed",
  kind: "integer",
  label: "Year installed",
  min: 1900,
  max: 2100,
};
const NOTES: EquipmentField = {
  key: "notes",
  kind: "text",
  label: "Notes",
  multiline: true,
};
const POWER_KW: EquipmentField = {
  key: "power_kw",
  kind: "number",
  label: "Power",
  suffix: "kW",
};
const HOURS: EquipmentField = {
  key: "hours",
  kind: "number",
  label: "Current hours",
  suffix: "hrs",
};

// ── Catalog ───────────────────────────────────────────────────────────
export const EQUIPMENT_CATALOG: EquipmentGroup[] = [
  // GROUP 1 — POWER & ELECTRICAL
  {
    category: "power",
    label: "Power & Electrical",
    items: [
      {
        key: "generator",
        label: "Generators",
        kind: "multi",
        maxUnits: 6,
        fields: [BRAND, MODEL, POWER_KW, HOURS, YEAR, SERIAL, NOTES],
      },
      {
        key: "inverter",
        label: "Inverter / Battery charger",
        kind: "toggle",
        fields: [BRAND, MODEL, POWER_KW],
      },
      {
        key: "solar_panels",
        label: "Solar panels",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "panels_count", kind: "integer", label: "Panel count" },
          { key: "total_watts", kind: "number", label: "Total watts", suffix: "W" },
        ],
      },
      {
        key: "wind_generator",
        label: "Wind generator",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          { key: "power_kw", kind: "number", label: "Power", suffix: "W" },
        ],
      },
      {
        key: "bow_thruster",
        label: "Bow thruster",
        kind: "toggle",
        fields: [
          BRAND,
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["Electric", "Hydraulic"],
          },
        ],
      },
      {
        key: "stern_thruster",
        label: "Stern thruster",
        kind: "toggle",
        fields: [
          BRAND,
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["Electric", "Hydraulic"],
          },
        ],
      },
      {
        key: "stabilizers",
        label: "Stabilizers",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["Gyroscope", "Fins", "Interceptors", "Magnus"],
          },
        ],
      },
      {
        key: "tender_crane",
        label: "Tender crane / lift",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "capacity_liters", kind: "number", label: "Capacity", suffix: "kg" },
        ],
      },
      {
        key: "electric_windlass",
        label: "Electric windlass",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
    ],
  },

  // GROUP 2 — WATER SYSTEMS
  {
    category: "water",
    label: "Water Systems",
    items: [
      {
        key: "watermaker",
        label: "Watermaker / Desalinator",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          {
            key: "capacity_liters",
            kind: "number",
            label: "Output",
            suffix: "L/hour",
          },
          HOURS,
        ],
      },
      {
        key: "water_heater",
        label: "Water heater",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "capacity_liters", kind: "number", label: "Capacity", suffix: "L" },
        ],
      },
      {
        key: "water_treatment",
        label: "Water treatment system",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
      {
        key: "freshwater_pump",
        label: "Freshwater pump system",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
    ],
  },

  // GROUP 3 — NAVIGATION & COMMUNICATION
  {
    category: "navigation",
    label: "Navigation & Communication",
    items: [
      { key: "radar", label: "Radar", kind: "toggle", fields: [BRAND, MODEL] },
      {
        key: "ais",
        label: "AIS transponder",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          { key: "type_detail", kind: "text", label: "MMSI number" },
        ],
      },
      {
        key: "chartplotter",
        label: "Chartplotter / MFD",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          {
            key: "capacity_liters",
            kind: "number",
            label: "Screen size",
            suffix: "in",
          },
        ],
      },
      {
        key: "autopilot",
        label: "Autopilot",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
      {
        key: "depth_sounder",
        label: "Depth sounder / Fishfinder",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
      {
        key: "vhf_radio",
        label: "VHF radio",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          {
            key: "type_detail",
            kind: "select",
            label: "DSC",
            options: ["Yes", "No"],
          },
        ],
      },
      {
        key: "ssb_radio",
        label: "SSB / HF radio",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
      {
        key: "satellite_phone",
        label: "Satellite phone",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
      {
        key: "starlink",
        label: "Starlink",
        kind: "toggle",
        fields: [
          {
            key: "type_detail",
            kind: "select",
            label: "Plan type",
            options: ["Roam", "Maritime", "Regional"],
          },
        ],
      },
      {
        key: "vsat",
        label: "VSAT satellite internet",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "type_detail", kind: "text", label: "Provider" },
          { key: "capacity_liters", kind: "number", label: "Speed", suffix: "Mbps" },
        ],
      },
      {
        key: "iridium",
        label: "Iridium satellite",
        kind: "toggle",
        fields: [{ key: "type_detail", kind: "text", label: "Device type" }],
      },
    ],
  },

  // GROUP 4 — SAFETY EQUIPMENT
  {
    category: "safety",
    label: "Safety Equipment",
    items: [
      {
        key: "life_rafts",
        label: "Life rafts",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 6 },
          {
            key: "capacity_persons",
            kind: "integer",
            label: "Total capacity (persons)",
          },
          {
            key: "type_detail",
            kind: "text",
            label: "Last service date",
            placeholder: "YYYY-MM-DD",
          },
        ],
      },
      {
        key: "epirb",
        label: "EPIRB",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          {
            key: "type_detail",
            kind: "text",
            label: "Expiry date",
            placeholder: "YYYY-MM-DD",
          },
        ],
      },
      {
        key: "mob_system",
        label: "MOB system (man overboard)",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["AIS", "DSC", "PLB"],
          },
        ],
      },
      {
        key: "fire_engine_room",
        label: "Fire suppression — engine room",
        kind: "toggle",
        fields: [
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["CO2", "FM200", "Novec", "Sprinklers"],
          },
        ],
      },
      {
        key: "fire_galley",
        label: "Fire suppression — galley",
        kind: "toggle",
        fields: [
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["CO2", "Wet chemical"],
          },
        ],
      },
      {
        key: "defibrillator",
        label: "Defibrillator (AED)",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          {
            key: "type_detail",
            kind: "text",
            label: "Last service date",
            placeholder: "YYYY-MM-DD",
          },
        ],
      },
      {
        key: "medical_oxygen",
        label: "Medical oxygen",
        kind: "toggle",
        fields: [
          {
            key: "quantity",
            kind: "stepper",
            label: "Cylinder count",
            min: 0,
            max: 12,
          },
          {
            key: "type_detail",
            kind: "text",
            label: "Last refill date",
            placeholder: "YYYY-MM-DD",
          },
        ],
      },
      {
        key: "night_vision",
        label: "Thermal / night vision camera",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
    ],
  },

  // GROUP 5 — COMFORT & CLIMATE
  {
    category: "comfort",
    label: "Comfort & Climate",
    items: [
      {
        key: "ac_central",
        label: "Air conditioning — central",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "power_kw", kind: "number", label: "Total capacity", suffix: "kW" },
          { key: "zones_count", kind: "integer", label: "Zones count" },
        ],
      },
      {
        key: "ac_split",
        label: "Air conditioning — split units",
        kind: "toggle",
        fields: [
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 20 },
          { key: "power_kw", kind: "number", label: "Total capacity", suffix: "kW" },
        ],
      },
      {
        key: "heating",
        label: "Heating system",
        kind: "toggle",
        fields: [
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["Diesel", "Electric", "Heat pump"],
          },
          BRAND,
        ],
      },
      {
        key: "underfloor_heating",
        label: "Underfloor heating",
        kind: "toggle",
        fields: [{ key: "type_detail", kind: "text", label: "Areas covered" }],
      },
      {
        key: "satellite_tv",
        label: "Satellite TV",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "type_detail", kind: "text", label: "Dish type" },
        ],
      },
      {
        key: "av_system",
        label: "AV system / Home theatre",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
      {
        key: "smart_home",
        label: "Smart home / automation",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "type_detail", kind: "text", label: "System name" },
        ],
      },
      {
        key: "underwater_lights",
        label: "Underwater lighting",
        kind: "toggle",
        fields: [
          {
            key: "type_detail",
            kind: "select",
            label: "Color",
            options: ["White", "Blue", "RGB"],
          },
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 30 },
        ],
      },
    ],
  },

  // GROUP 6 — WATER TOYS & TENDERS
  {
    category: "toys",
    label: "Water Toys & Tenders",
    items: [
      {
        key: "tender",
        label: "Tenders",
        kind: "multi",
        maxUnits: 4,
        fields: [
          BRAND,
          MODEL,
          { key: "capacity_liters", kind: "number", label: "Length", suffix: "m" },
          { key: "type_detail", kind: "text", label: "Engine brand" },
          { key: "power_hp", kind: "number", label: "Engine power", suffix: "HP" },
          HOURS,
          YEAR,
        ],
      },
      {
        key: "jetski",
        label: "Jet Skis / PWC",
        kind: "multi",
        maxUnits: 4,
        fields: [BRAND, MODEL, YEAR, HOURS],
      },
      {
        key: "sup_boards",
        label: "SUP boards",
        kind: "toggle",
        fields: [{ key: "quantity", kind: "stepper", label: "Count", min: 0, max: 12 }],
      },
      {
        key: "kayaks",
        label: "Kayaks",
        kind: "toggle",
        fields: [
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 8 },
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["Single", "Double"],
          },
        ],
      },
      {
        key: "diving_compressor",
        label: "Diving compressor",
        kind: "toggle",
        fields: [BRAND, MODEL, HOURS],
      },
      {
        key: "diving_equipment",
        label: "Diving equipment",
        kind: "toggle",
        fields: [
          { key: "quantity", kind: "stepper", label: "Sets count", min: 0, max: 20 },
          {
            key: "type_detail",
            kind: "text",
            label: "Last service",
            placeholder: "YYYY-MM-DD",
          },
        ],
      },
      {
        key: "water_skis",
        label: "Water skis / Wakeboard",
        kind: "toggle",
        fields: [{ key: "quantity", kind: "stepper", label: "Count", min: 0, max: 12 }],
      },
      {
        key: "kitesurf",
        label: "Kitesurf equipment",
        kind: "toggle",
        fields: [
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 8 },
          BRAND,
        ],
      },
      {
        key: "windsurfer",
        label: "Windsurfer",
        kind: "toggle",
        fields: [{ key: "quantity", kind: "stepper", label: "Count", min: 0, max: 8 }],
      },
      {
        key: "underwater_scooter",
        label: "Underwater scooter",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 8 },
        ],
      },
      {
        key: "water_slide",
        label: "Inflatable water slide",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "capacity_liters", kind: "number", label: "Length", suffix: "m" },
        ],
      },
      {
        key: "water_trampoline",
        label: "Water trampoline",
        kind: "toggle",
        fields: [BRAND, { key: "type_detail", kind: "text", label: "Size" }],
      },
      {
        key: "electric_surfboard",
        label: "Electric surfboard / Foil",
        kind: "toggle",
        fields: [
          BRAND,
          MODEL,
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 6 },
        ],
      },
      {
        key: "fishing_equipment",
        label: "Fishing equipment",
        kind: "toggle",
        fields: [
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["Trolling", "Bottom", "Fly"],
          },
        ],
      },
      {
        key: "snorkeling_sets",
        label: "Snorkeling sets",
        kind: "toggle",
        fields: [{ key: "quantity", kind: "stepper", label: "Count", min: 0, max: 30 }],
      },
    ],
  },

  // GROUP 7 — DECK & RIGGING
  {
    category: "deck",
    label: "Deck & Rigging",
    items: [
      {
        key: "passerelle",
        label: "Hydraulic passerelle / gangway",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "capacity_liters", kind: "number", label: "Length", suffix: "m" },
        ],
      },
      {
        key: "swim_platform_lift",
        label: "Swim platform lift",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "power_kw", kind: "number", label: "Capacity", suffix: "kg" },
        ],
      },
      {
        key: "anchor_windlass",
        label: "Electric anchor windlass",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "capacity_liters", kind: "number", label: "Chain length", suffix: "m" },
        ],
      },
      {
        key: "second_anchor",
        label: "Second anchor system",
        kind: "toggle",
        fields: [
          { key: "type_detail", kind: "text", label: "Type" },
          { key: "capacity_liters", kind: "number", label: "Chain length", suffix: "m" },
        ],
      },
      {
        key: "cockpit_enclosure",
        label: "Cockpit enclosure / bimini",
        kind: "toggle",
        fields: [
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["Hard", "Soft"],
          },
        ],
      },
      {
        key: "underwater_camera",
        label: "Underwater camera / drone",
        kind: "toggle",
        fields: [BRAND, MODEL],
      },
    ],
  },

  // GROUP 7b — SAILING SPECIFIC (only Sailing + Catamaran yacht types)
  {
    category: "sailing",
    label: "Sailing Specific",
    yachtTypes: ["sailing_yacht", "catamaran"],
    items: [
      {
        key: "rig_type",
        label: "Rig type",
        kind: "toggle",
        fields: [
          {
            key: "type_detail",
            kind: "select",
            label: "Type",
            options: ["Sloop", "Ketch", "Cutter", "Cat", "Schooner"],
          },
        ],
      },
      {
        key: "electric_winches",
        label: "Electric winches",
        kind: "toggle",
        fields: [
          BRAND,
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 12 },
        ],
      },
      {
        key: "self_tacking_jib",
        label: "Self-tacking jib",
        kind: "toggle",
        fields: [BRAND],
      },
      {
        key: "code_zero",
        label: "Code zero / Asymmetric spinnaker",
        kind: "toggle",
        fields: [BRAND],
      },
      {
        key: "bowsprit",
        label: "Bowsprit",
        kind: "toggle",
        fields: [
          { key: "capacity_liters", kind: "number", label: "Length", suffix: "m" },
        ],
      },
      {
        key: "furling_systems",
        label: "Furling systems",
        kind: "toggle",
        fields: [
          { key: "quantity", kind: "stepper", label: "Count", min: 0, max: 8 },
          BRAND,
        ],
      },
      {
        key: "mast",
        label: "Mast brand & material",
        kind: "toggle",
        fields: [
          BRAND,
          {
            key: "type_detail",
            kind: "select",
            label: "Material",
            options: ["Aluminum", "Carbon"],
          },
        ],
      },
    ],
  },
];

/**
 * Flatten catalog into a map for fast lookup by equipment_type. Useful for
 * overview rendering and completeness scoring.
 */
export const EQUIPMENT_DEF_BY_KEY: Record<string, EquipmentDef> = (() => {
  const out: Record<string, EquipmentDef> = {};
  for (const g of EQUIPMENT_CATALOG) {
    for (const i of g.items) out[i.key] = i;
  }
  return out;
})();

/**
 * Produce a short single-line summary of an equipment item, used in the
 * yacht overview ("EQUIPMENT & SYSTEMS" section). Returns empty string if
 * nothing notable was filled.
 */
export function summarizeEquipment(item: EquipmentItem): string {
  const def = EQUIPMENT_DEF_BY_KEY[item.equipment_type];
  if (!def) return "";
  const parts: string[] = [];
  if (item.brand) parts.push(item.brand);
  if (item.model) parts.push(item.model);
  if (item.type_detail) parts.push(item.type_detail);
  if (item.power_kw != null) parts.push(`${item.power_kw} kW`);
  if (item.power_hp != null) parts.push(`${item.power_hp} HP`);
  if (item.hours != null) parts.push(`${item.hours} hrs`);
  if (item.capacity_liters != null) {
    // capacity_liters is overloaded (L, L/h, m, kg, in, Mbps) — only show
    // when no other spec stole the spotlight.
    if (parts.length < 2) parts.push(String(item.capacity_liters));
  }
  if (item.capacity_persons != null) parts.push(`${item.capacity_persons} pers`);
  if (item.zones_count != null) parts.push(`${item.zones_count} zones`);
  if (item.panels_count != null && item.total_watts != null) {
    parts.push(`${item.panels_count} × ${item.total_watts} W`);
  }
  return parts.join(" · ");
}
