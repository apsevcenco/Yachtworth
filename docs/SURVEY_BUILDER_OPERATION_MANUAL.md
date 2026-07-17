# Yachtworth Survey Builder Operation Manual

Last updated: 2026-07-17

This document is the source of truth for the Yachtworth Survey Builder. It exists so that any developer, product owner, designer, or future AI agent can understand how the survey constructor is meant to work before changing code.

The Survey Builder is not a simple checklist. It is intended to become a professional, offline-capable, mobile-and-desktop survey system for yacht surveyors, brokers, owners, and commercial operators.

## 1. Product Principle

The Survey Builder must support real survey work in the field.

Mobile is the working tool on board:

- open or create a report before boarding;
- work without internet;
- inspect section by section;
- take photos directly into the correct item;
- dictate notes later when voice input is added;
- save locally first;
- sync when connection returns.

Desktop is the office tool:

- prepare report structure before the survey;
- continue the same report started on mobile;
- edit longer notes and conclusions;
- review photos and recommendations;
- generate final PDF;
- issue a professional client-facing report.

Mobile and desktop must use the same report, same database, same ownership rules, and same PDF engine. They must not become two separate products.

## 2. Current System Baseline

The current implementation already has a useful base:

- Survey report creation flow.
- 26 seeded survey sections.
- Per-section item editor.
- Common fields: condition, notes, recommendation level, recommendation text, photos.
- Recommendation levels A/B/C/D.
- Moisture readings in the hull section.
- Item photo upload.
- Sea trial screen with RPM table.
- Surveyor profile and signature.
- Survey history.
- Backend ownership protection.
- PDF generation through the current v2 document engine.

This baseline should not be thrown away. It should be evolved into a professional section-aware system.

## 3. Problem With The Current Model

The current item model treats almost all sections the same.

That is not professional enough.

For example, an engine section cannot be properly represented by only:

- condition;
- notes;
- recommendation;
- photos.

An engine inspection needs fields such as:

- engine make;
- model;
- serial number;
- engine hours;
- mount condition;
- oil condition;
- coolant condition;
- belts and hoses;
- exhaust condition;
- turbocharger condition;
- gearbox condition;
- start test;
- smoke;
- vibration;
- service history.

Likewise, safety equipment needs expiry dates, document sections need certificate status, hull sections need moisture grids, electrical sections need AC/DC-specific checks, and commercial coding needs compliance fields.

The target architecture is therefore section-aware.

## 4. Target Architecture

The Survey Builder should be built around this hierarchy:

```text
Survey Report
  -> Report Type
  -> Scope / Standards / Limitations
  -> Section Pack
  -> Section
  -> Item
  -> Common Fields
  -> Section-Specific Fields
  -> Photos / Evidence
  -> Recommendations
  -> PDF Output
```

The key idea:

- every item has common fields;
- every section may define specialized fields;
- every report type chooses the sections and rules it needs.

## 5. Supported Report Types

The product should support these report types over time.

### 5.1 Pre-Purchase Condition & Valuation Survey

Purpose: full inspection before purchase.

Must include:

- scope and limitations;
- vessel particulars;
- document review;
- hull and structure;
- deck and fittings;
- machinery;
- fuel;
- electrical AC/DC;
- plumbing;
- safety equipment;
- navigation equipment;
- sea trial where performed;
- haul-out / underwater inspection where performed;
- recommendation summary;
- valuation section;
- declaration.

This is the most complete private-yacht report type.

### 5.2 Insurance Condition & Valuation Survey

Purpose: insurer underwriting and renewal.

Focus:

- insurability;
- safety risks;
- fire/flood/sinking risks;
- condition affecting risk;
- current market value;
- required repairs before cover.

May be shorter than pre-purchase but must be strong on safety and risk.

### 5.3 Damage Survey / Claim Report

Purpose: document damage after incident.

Must include:

- incident details;
- date and location;
- reported cause;
- observed damage;
- affected systems;
- photo evidence;
- repair recommendations;
- repair estimate fields;
- causation notes;
- whether specialist inspection is required.

### 5.4 Appraisal / Valuation Report

Purpose: value opinion only.

Must include:

- vessel particulars;
- market condition;
- comparable evidence;
- condition assumptions;
- valuation basis;
- fair market value;
- replacement value where applicable;
- limitations.

It is not a full condition survey unless combined with another report type.

### 5.5 Sea Trial Report

Purpose: record underway performance.

Must include:

- weather and sea state;
- load/fuel/water state if known;
- RPM table;
- speed;
- coolant temperature;
- oil pressure;
- steering response;
- vibration;
- smoke;
- alarms;
- maneuvering;
- observations.

May be standalone or embedded in pre-purchase.

### 5.6 Rigging / Sail Survey

Purpose: sailing yacht rig and sail condition.

Must include:

- mast;
- boom;
- standing rigging;
- running rigging;
- chainplates;
- furling systems;
- winches;
- sails;
- deck hardware;
- age/service history where known.

### 5.7 Engine / Mechanical Specialist Survey

Purpose: machinery-specific inspection.

Must include:

- main engines;
- generators;
- gearboxes;
- cooling systems;
- exhaust systems;
- fuel systems;
- mounts;
- service records;
- test results.

### 5.8 Commercial Coding / Compliance Survey

Purpose: commercial use, charter, or coding support.

Must include fields aligned to applicable commercial vessel rules, including MCA small commercial vessel coding where relevant.

Typical focus:

- operating category;
- area of operation;
- stability;
- lifesaving equipment;
- fire safety;
- navigation lights;
- radio equipment;
- manning;
- certificates;
- expiry dates;
- required rectification before commercial operation.

### 5.9 Large Yacht / Class / Statutory Support

Purpose: support for larger commercial yachts and class/statutory survey workflows.

Must include:

- class society;
- flag;
- certificate register;
- annual/intermediate/renewal survey status;
- safety management references where applicable;
- statutory equipment;
- open deficiencies.

This mode is likely a later phase because it is heavier and more compliance-driven.

## 6. Common Report Fields

Every report should have:

- report id;
- report type;
- status: draft, in progress, ready for review, complete, issued;
- linked yacht id where applicable;
- vessel name;
- manufacturer;
- model;
- year built;
- flag;
- registration number;
- HIN/WIN/CIN;
- lying location;
- survey date;
- survey location;
- client;
- surveyor;
- surveyor company;
- surveyor qualification;
- weather;
- sea state;
- scope;
- intended use;
- standards referenced;
- limitations;
- generated PDF metadata.

## 7. Common Item Fields

Every survey item should have:

- item id;
- report id;
- section id;
- item number;
- title / description;
- inspected status:
  - inspected;
  - not inspected;
  - not applicable;
  - inaccessible;
  - owner reported;
  - specialist required.
- condition:
  - excellent;
  - good/serviceable;
  - fair;
  - poor;
  - unsafe;
  - unknown.
- notes;
- defect description;
- test method:
  - visual;
  - operational;
  - moisture meter;
  - percussion sounding;
  - sea trial;
  - document review;
  - owner declaration;
  - specialist report.
- recommendation level:
  - A: urgent / safety critical;
  - B: soon / required for reliable operation;
  - C: specialist investigation;
  - D: cosmetic / discretionary.
- recommendation text;
- safety critical flag;
- insurance critical flag;
- commercial compliance flag;
- regulatory reference;
- estimated cost where useful;
- due date / urgency;
- photo urls;
- local photo queue for offline mode;
- section-specific data object.

## 8. Section-Specific Data

Each section must be able to define its own fields.

Implementation principle:

```text
survey_items.common fields
survey_items.section_data json/jsonb
```

The `section_data` object stores specialized fields without forcing every database column to exist for every section.

### 8.1 Documents Section

Fields:

- registration seen;
- registration number;
- ownership/title document status;
- VAT status;
- VAT evidence seen;
- CE/UKCA/RCD/RCR evidence;
- builder plate;
- HIN/WIN/CIN verified;
- insurance certificate;
- class certificate;
- coding certificate;
- service records;
- manuals;
- open document issues.

### 8.2 Hull Section

Fields:

- hull material;
- hull type;
- underwater inspection performed;
- haul-out performed;
- moisture readings;
- moisture meter type;
- calibration / reference note;
- osmosis/blistering;
- delamination;
- impact damage;
- previous repairs;
- antifouling condition;
- anodes;
- keel/appendages;
- transom;
- through-hull condition summary.

### 8.3 Deck And Superstructure

Fields:

- deck material;
- teak condition;
- core moisture;
- soft spots;
- hatches;
- portlights;
- rails/stanchions;
- cleats/fairleads;
- windlass;
- crane/davit;
- passerelle;
- flybridge condition.

### 8.4 Engines

Fields:

- engine count;
- port/starboard labels;
- make;
- model;
- serial number;
- year;
- hours;
- horsepower;
- engine room access;
- visual condition;
- mounts;
- oil leaks;
- coolant leaks;
- belts;
- hoses;
- exhaust;
- turbocharger;
- air filters;
- fuel filters;
- start test;
- smoke;
- vibration;
- service history;
- diagnostic scan performed;
- specialist required.

### 8.5 Gearboxes / Transmissions

Fields:

- make;
- model;
- serial number;
- oil condition;
- leaks;
- mounts;
- shaft coupling;
- operational test;
- noise/vibration.

### 8.6 Generators

Fields:

- generator count;
- make;
- model;
- serial number;
- hours;
- kW rating;
- start test;
- load test;
- cooling;
- exhaust;
- mounts;
- leaks;
- service history.

### 8.7 Fuel System

Fields:

- tank material;
- tank capacity;
- tank access;
- fuel lines;
- shutoff valves;
- filters;
- water separators;
- leaks;
- ventilation;
- fill/vent condition.

### 8.8 Electrical AC/DC

Fields:

- battery banks;
- battery age;
- battery type;
- charger;
- inverter;
- shore power inlet;
- shore power cable;
- AC panel;
- DC panel;
- breakers/fuses;
- RCD/GFCI where applicable;
- bonding;
- corrosion;
- cable condition;
- generator integration;
- solar/wind equipment.

### 8.9 Plumbing / Fresh / Waste Water

Fields:

- freshwater tanks;
- pumps;
- accumulator;
- calorifier;
- watermaker;
- toilets;
- holding tanks;
- seacocks;
- hoses;
- leaks;
- macerator;
- discharge compliance note.

### 8.10 Fire And Safety

Fields:

- fixed fire system;
- fixed fire system service date;
- portable extinguishers count;
- extinguisher expiry dates;
- fire blanket;
- smoke alarms;
- CO alarms;
- gas detector;
- bilge pumps count;
- bilge pump operational test;
- high water alarm;
- liferaft;
- liferaft service date;
- lifejackets count;
- flares expiry;
- EPIRB registration/expiry;
- MOB equipment.

### 8.11 Navigation And Communication

Fields:

- chartplotter/MFD;
- radar;
- AIS;
- VHF;
- VHF DSC/MMSI;
- autopilot;
- compass;
- depth;
- speed/log;
- navigation lights;
- horn;
- satellite communication;
- software/charts date where known.

### 8.12 Rigging And Sails

Fields:

- mast type;
- mast material;
- standing rigging age;
- running rigging condition;
- chainplates;
- spreaders;
- boom;
- furling gear;
- winches;
- sails inventory;
- sail condition;
- rig inspection aloft performed.

### 8.13 Sea Trial

Fields:

- trial date;
- location;
- weather;
- sea state;
- fuel/water load where known;
- RPM table;
- max RPM;
- max speed;
- tickover RPM;
- tickover speed;
- steering;
- maneuvering;
- vibration;
- smoke;
- temperatures;
- pressures;
- alarms;
- narrative.

## 9. Offline-First Requirement

Offline capability is mandatory for the mobile app.

The app must support:

- opening report templates without network;
- editing report fields without network;
- adding notes without network;
- taking photos without network;
- saving photos locally;
- queueing uploads;
- showing sync status;
- retrying failed sync;
- preserving data if the app is closed.

The user must never lose inspection notes or photos because of poor marina or shipyard internet.

## 10. Sync Model

Every editable entity should eventually support:

- local id;
- server id;
- updated_at;
- deleted_at where needed;
- sync status:
  - local only;
  - pending;
  - syncing;
  - synced;
  - failed;
  - conflict.
- device source;
- last synced at.

Sync must be conflict-aware.

Practical rule:

- mobile field work should never be silently overwritten by desktop edits;
- desktop review should warn if mobile has newer unsynced changes;
- photos should be append-safe;
- section saves should not replace unrelated sections.

The existing per-section replace approach is good and should be preserved because it avoids overwriting other sections.

## 11. Photos

Photos are evidence, not decoration.

Each photo should eventually support:

- local uri;
- remote url;
- report id;
- section number;
- item id;
- caption;
- taken_at;
- uploaded_at;
- sync status;
- sort order;
- include in PDF flag.

PDF output should include:

- item-level photos near findings where useful;
- final photo gallery;
- captions;
- no broken image placeholders.

## 12. Voice Input

Voice input is a future feature, but the architecture must allow it.

Voice should be attachable to:

- notes;
- defect description;
- recommendation text;
- limitations;
- conclusion;
- sea trial narrative;
- damage narrative.

The UI should later allow a microphone action next to text fields. The data model does not need a special voice field if transcription is stored as normal text, but optional audio evidence may be added later.

## 13. PDF Requirements

The PDF must adapt to report type.

Common PDF structure:

1. Cover.
2. Report metadata.
3. Scope and limitations.
4. Vessel particulars.
5. Document review.
6. Executive summary.
7. Recommendation summary grouped by priority.
8. Findings by section.
9. Sea trial where applicable.
10. Valuation where applicable.
11. Photo gallery.
12. Declaration and signature.

PDF must not simply dump raw form fields. It must read like a professional survey report.

## 14. Recommendation System

Recommendation levels:

- A: urgent, safety critical, required before operation;
- B: required at earliest opportunity for continued reliable operation;
- C: specialist inspection or further investigation required;
- D: cosmetic, discretionary, or non-essential.

PDF should include:

- count by level;
- summary table;
- critical items first;
- section references;
- clear wording.

## 15. Professional Limitations

Every report must clearly state limitations.

Examples:

- no dismantling unless stated;
- hidden areas not inspected;
- machinery not internally examined unless stated;
- electrical systems visually/operationally checked only unless stated;
- no guarantee of future condition;
- report for named client/intended use only;
- specialist reports relied upon where applicable.

Limitations must be selected and editable, not hardcoded as one generic paragraph.

## 16. Standards And References

The constructor should allow references to common standards or frameworks where relevant:

- ABYC-style system categories and safety logic;
- IIMS / SAMS / NAMS professional survey practice;
- RYA guidance for boat purchase and survey;
- UK Recreational Craft Regulations / RCD / RCR / CE / UKCA where relevant;
- MCA MGN 280 / Small Commercial Vessel Code for commercial coding mode;
- REG Yacht Code for large commercial yacht context;
- class society requirements where applicable.

The app should not claim compliance or certification unless the surveyor has actually performed that scope and is qualified to do so.

## 17. Implementation Phases

### Phase 1: Foundation

- Add report type model.
- Add scope/standards/limitations fields.
- Add `section_data` support for items.
- Keep old reports readable.
- Keep existing 26 sections working.

### Phase 2: Section-Aware Templates

- Replace generic item templates with section-specific schemas.
- Add specialized fields for documents, hull, engines, generators, electrical, safety, navigation, rigging, sea trial.
- Keep common fields across all items.

### Phase 3: UI Upgrade

- Survey Setup starts with report type.
- Section screens render fields based on section schema.
- Mobile remains compact and fast.
- Desktop gets wider professional review layout.

### Phase 4: Offline Layer

- Local report storage.
- Local item storage.
- Local photo queue.
- Sync status.
- Retry failed uploads.
- Conflict-safe merge rules.

### Phase 5: PDF Upgrade

- Report-type-specific PDF sections.
- Recommendation summary.
- Document review.
- Photo gallery.
- Item photos.
- Better declarations and limitations.

### Phase 6: Voice Input

- Add voice transcription to text fields.
- Optional audio evidence later.

## 18. Non-Negotiable Rules For Future Changes

Do not break existing mobile workflow.

Do not make desktop and mobile separate data systems.

Do not remove existing survey reports without migration.

Do not overwrite other sections when saving one section.

Do not let photo upload failure erase local photos.

Do not hardcode one report structure for all report types.

Do not pretend a report is regulatory/compliance-certified unless the selected report type and surveyor inputs support that.

Do not generate a professional-looking PDF from incomplete data without clear limitations.

## 19. Developer Checklist Before Changing Survey Builder

Before changing Survey Builder, check:

- Does this affect mobile?
- Does this affect desktop?
- Does this affect offline future compatibility?
- Does this affect existing reports?
- Does this affect PDF output?
- Does this affect ownership/auth?
- Does this affect photo storage?
- Does this affect section save behavior?
- Does this introduce a report-type-specific rule?

After changing Survey Builder, verify:

- Typecheck passes.
- Web build passes.
- Existing survey report opens.
- New survey report can be created.
- Section can be edited and saved.
- Photos still upload.
- PDF still generates.
- History still lists reports.

## 20. Current Code Areas

Key frontend areas:

- `artifacts/yachtworth-app/app/survey/new.tsx`
- `artifacts/yachtworth-app/app/survey/index.tsx`
- `artifacts/yachtworth-app/app/survey/[id]/index.tsx`
- `artifacts/yachtworth-app/app/survey/[id]/section/[n].tsx`
- `artifacts/yachtworth-app/app/survey/[id]/sea-trial.tsx`
- `artifacts/yachtworth-app/lib/surveyTemplates.ts`
- `artifacts/yachtworth-app/lib/surveyItemPhotoUpload.ts`
- `artifacts/yachtworth-app/lib/documentExport.ts`

Key backend areas:

- `artifacts/api-server/src/routes/surveyReports.ts`
- `artifacts/api-server/src/documents/builders/survey.ts`
- `artifacts/api-server/src/documents/documentTypes.ts`
- `lib/api-zod/src/generated/*`
- `lib/api-spec/openapi.yaml`
- `migrations/*`

## 21. Desired End State

The desired end state is:

- A surveyor can prepare a survey on desktop.
- The same survey opens on mobile.
- The surveyor can work onboard offline.
- Photos and notes are safely captured.
- The report syncs when online.
- The surveyor finalizes the report on desktop.
- The PDF is professional, structured, and report-type aware.
- The tool supports multiple professional report types without code duplication.

This is the standard every future change should move toward.
