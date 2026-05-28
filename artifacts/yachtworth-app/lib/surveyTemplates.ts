// Survey Report Builder — 26 section templates (YDSA / IIMS / SCMS).
// Each section pre-seeds default items; surveyor can edit, delete, add.

export type SectionKind = "items" | "static" | "auto_recs" | "declaration" | "pictures" | "sea_trial";

export type TemplateItem = {
  number: string;
  description: string;
};

export type SectionTemplate = {
  number: number;
  name: string;
  kind: SectionKind;
  staticContent?: string;
  items?: TemplateItem[];
};

export const GLOSSARY_TEXT = `Excellent condition — The item described is in 'as new' condition.
Serviceable / Functioning — The item described is serviceable and fit for purpose.
Fair condition — The item described is serviceable but showing signs of wear.
Poor condition — The item described is in need of replacement or repair.
Moisture readings — Low, Medium or High as measured by moisture meter.

Recommendations:
A — Urgent. Required to ensure safe operation of the vessel.
B — Soonest opportunity. Required for continued successful operation.
C — Expert or specialist required to investigate further.
D — Cosmetic or leisure equipment.`;

export const DECLARATION_TEXT = `I, the undersigned surveyor, certify that this report is a true record of the condition of the vessel at the date of the survey, based on the items visually inspected and tested where possible. No parts were dismantled. Hidden defects cannot be reported on. This report is for the sole use of the named client and is not transferable.`;

export const SECTION_TEMPLATES: SectionTemplate[] = [
  { number: 1, name: "Introduction", kind: "items", items: [
    { number: "1.0", description: "Client and location" },
    { number: "1.1", description: "Purpose and scope" },
  ]},
  { number: 2, name: "Specification", kind: "items", items: [
    { number: "2.0", description: "Vessel specifications from ships papers" },
  ]},
  { number: 3, name: "Glossary of Terms", kind: "static", staticContent: GLOSSARY_TEXT },
  { number: 4, name: "Limitations of Survey", kind: "items", items: [
    { number: "4.0", description: "No parts dismantled" },
    { number: "4.1", description: "Covered/obscured areas" },
    { number: "4.2", description: "Owner declarations" },
    { number: "4.3", description: "Conditions" },
  ]},
  { number: 5, name: "Construction", kind: "items", items: [
    { number: "5.0", description: "Hull construction and material" },
    { number: "5.1", description: "Deck construction" },
  ]},
  { number: 6, name: "Hull", kind: "items", items: [
    { number: "6.0", description: "Hull inspection (above/below waterline)" },
    { number: "6.1", description: "Hull condition and antifouling" },
    { number: "6.2", description: "Osmosis / moisture readings" },
  ]},
  { number: 7, name: "Rudders and Steering", kind: "items", items: [
    { number: "7.0", description: "Rudder condition and bearings" },
    { number: "7.1", description: "Steering system" },
    { number: "7.2", description: "Autopilot" },
  ]},
  { number: 8, name: "Stern Gear", kind: "items", items: [
    { number: "8.0", description: "Stern gear inspection" },
    { number: "8.1", description: "Shaft logs and seals (PSS)" },
    { number: "8.2", description: "Propellers and anodes" },
  ]},
  { number: 9, name: "Through Hull Fittings and Seacocks", kind: "items", items: [
    { number: "9.0", description: "Engine raw water intakes" },
    { number: "9.1", description: "AC raw water intake" },
    { number: "9.2", description: "Generator raw water intakes" },
    { number: "9.3", description: "Watermaker intake" },
    { number: "9.4", description: "Overboard discharge seacocks" },
  ]},
  { number: 10, name: "Hull Topsides", kind: "items", items: [
    { number: "10.0", description: "Topsides condition" },
    { number: "10.1", description: "Gelcoat / paint condition" },
    { number: "10.2", description: "Handrails and fendering" },
  ]},
  { number: 11, name: "Deck and Fittings", kind: "items", items: [
    { number: "11.0", description: "Deck surface and overlay" },
    { number: "11.1", description: "Foredeck" },
    { number: "11.2", description: "Guard rails and stanchions" },
    { number: "11.3", description: "Anchor windlass / capstans" },
    { number: "11.4", description: "Aft capstans / winches" },
    { number: "11.5", description: "Wheelhouse windscreen and wipers" },
    { number: "11.6", description: "Fairleads and cleats" },
    { number: "11.7", description: "Fenders and mooring lines" },
    { number: "11.8", description: "Tender crane / deck crane" },
    { number: "11.9", description: "Passerelle / gangway" },
    { number: "11.10", description: "Flybridge" },
    { number: "11.11", description: "Anchors and chain" },
  ]},
  { number: 12, name: "Hatches and Port Lights", kind: "items", items: [
    { number: "12.0", description: "Deck hatches" },
    { number: "12.1", description: "Cabin portlights" },
    { number: "12.2", description: "Saloon windows" },
  ]},
  { number: 13, name: "Ventilation", kind: "items", items: [
    { number: "13.0", description: "Air conditioning system" },
    { number: "13.1", description: "Natural ventilation" },
  ]},
  { number: 14, name: "Canvas and Covers", kind: "items", items: [
    { number: "14.0", description: "Saloon seating and cushions" },
    { number: "14.1", description: "Cabin mattresses and covers" },
    { number: "14.2", description: "Bimini / cockpit covers" },
  ]},
  { number: 15, name: "Engines and Transmissions", kind: "items", items: [
    { number: "15.0", description: "Engine condition and installation" },
    { number: "15.1", description: "Engine mountings" },
    { number: "15.2", description: "Exhaust system" },
    { number: "15.3", description: "Air filters and turbochargers" },
    { number: "15.4", description: "Gearboxes / transmissions" },
    { number: "15.5", description: "Fuel system and filters" },
    { number: "15.6", description: "Fuel tanks" },
    { number: "15.7", description: "Day tanks" },
  ]},
  { number: 16, name: "Internal Structure and Bilges", kind: "items", items: [
    { number: "16.0", description: "Bulkheads and structure" },
    { number: "16.1", description: "Stem and keel" },
    { number: "16.2", description: "Frames and stringers" },
    { number: "16.3", description: "Bilge pumps and float switches" },
    { number: "16.4", description: "Bilge condition" },
  ]},
  { number: 17, name: "Accommodation and Domestic", kind: "items", items: [
    { number: "17.0", description: "Forward cabin(s)" },
    { number: "17.1", description: "Guest cabin(s)" },
    { number: "17.2", description: "Master cabin" },
    { number: "17.3", description: "Galley and appliances" },
    { number: "17.4", description: "Saloon and dining" },
    { number: "17.5", description: "Laundry" },
    { number: "17.6", description: "Interior finishes" },
  ]},
  { number: 18, name: "Fresh and Waste Water", kind: "items", items: [
    { number: "18.0", description: "Fresh water system" },
    { number: "18.1", description: "Heads / toilets" },
    { number: "18.2", description: "Holding tanks" },
    { number: "18.3", description: "Watermaker" },
  ]},
  { number: 19, name: "Electrical System and Generators", kind: "items", items: [
    { number: "19.0", description: "Shore power connection" },
    { number: "19.1", description: "DC battery bank" },
    { number: "19.2", description: "Switchboards and distribution" },
    { number: "19.3", description: "Generator(s) condition" },
    { number: "19.4", description: "Generator exhaust and cooling" },
    { number: "19.5", description: "Solar / wind generation" },
  ]},
  { number: 20, name: "Fire and Safety Equipment", kind: "items", items: [
    { number: "20.0", description: "Fixed fire suppression (engine room)" },
    { number: "20.1", description: "Portable extinguishers" },
    { number: "20.2", description: "Life rafts" },
    { number: "20.3", description: "Flares and pyrotechnics" },
    { number: "20.4", description: "Life vests / PFDs" },
    { number: "20.5", description: "EPIRB" },
    { number: "20.6", description: "MOB equipment" },
  ]},
  { number: 21, name: "Navigation Equipment", kind: "items", items: [
    { number: "21.0", description: "Chartplotters / MFD" },
    { number: "21.1", description: "Autopilot" },
    { number: "21.2", description: "Depth sounder" },
    { number: "21.3", description: "VHF radio" },
    { number: "21.4", description: "Navigation lights" },
    { number: "21.5", description: "AIS transponder" },
    { number: "21.6", description: "Radar" },
    { number: "21.7", description: "Satellite / internet comms" },
  ]},
  { number: 22, name: "Miscellaneous Equipment", kind: "items", items: [
    { number: "22.0", description: "Stabilisers" },
    { number: "22.1", description: "Tenders and water toys" },
    { number: "22.2", description: "Davits and crane" },
    { number: "22.3", description: "Ships horn" },
    { number: "22.4", description: "Other equipment" },
  ]},
  { number: 23, name: "Comments and Recommendations", kind: "auto_recs" },
  { number: 24, name: "Surveyors Declaration", kind: "declaration", staticContent: DECLARATION_TEXT },
  { number: 25, name: "Pictures", kind: "pictures" },
  { number: 26, name: "Sea Trial", kind: "sea_trial" },
];

export type ConditionLevel =
  | "Excellent"
  | "Serviceable"
  | "Fair"
  | "Poor"
  | "N/A"
  | "Not inspected";

export const CONDITION_OPTIONS: { value: ConditionLevel; label: string }[] = [
  { value: "Excellent", label: "Excellent condition" },
  { value: "Serviceable", label: "Serviceable / Functioning" },
  { value: "Fair", label: "Fair condition" },
  { value: "Poor", label: "Poor condition" },
  { value: "N/A", label: "Not applicable (N/A)" },
  { value: "Not inspected", label: "Not inspected" },
];

export type RecLevel = "A" | "B" | "C" | "D";

export const REC_OPTIONS: { value: RecLevel; short: string; full: string }[] = [
  { value: "A", short: "A — Urgent", full: "Urgent: ensure safe operation" },
  { value: "B", short: "B — Soon", full: "Soonest opportunity for continued operation" },
  { value: "C", short: "C — Expert", full: "Expert / specialist required" },
  { value: "D", short: "D — Cosmetic", full: "Cosmetic / leisure equipment" },
];

export function sectionStatus(args: {
  totalItems: number;
  filledItems: number;
  hasRecA: boolean;
  hasAnyRec: boolean;
}): "empty" | "partial" | "complete" | "warning" | "urgent" {
  const { totalItems, filledItems, hasRecA, hasAnyRec } = args;
  if (hasRecA) return "urgent";
  if (hasAnyRec) return "warning";
  if (totalItems === 0) return "empty";
  if (filledItems === 0) return "empty";
  if (filledItems < totalItems) return "partial";
  return "complete";
}
