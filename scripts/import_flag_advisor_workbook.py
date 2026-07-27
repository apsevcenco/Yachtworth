#!/usr/bin/env python3
"""Import Yachtworth Flag Advisor workbook into auditable SQL.

The script intentionally uses only Python standard library modules so it can run
on a clean workstation without changing the Node/Expo dependency graph.

Usage:
  python scripts/import_flag_advisor_workbook.py path/to/Yachtworth_Flag_Registry_Base_v1.xlsx --out exports/flag_advisor
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

REQUIRED_SHEETS = ["Overview", "Flag_Master", "Fee_Schedules", "Source_Index", "Field_Definitions"]

FLAG_COLUMNS = [
    "Flag",
    "Country / Territory",
    "Official Registry",
    "Registry Family",
    "EU Flag",
    "Private Registration",
    "Commercial Registration",
    "Private Minimum LOA",
    "Commercial Minimum LOA",
    "Maximum LOA / GT",
    "Passenger Limit",
    "Provisional / Interim",
    "Provisional Validity",
    "Permanent Validity / Renewal",
    "Owner Eligibility",
    "Foreign Company Ownership",
    "Local / Resident Agent",
    "Mortgage Registration",
    "Radio Licence",
    "Classification Requirement",
    "Survey / Inspection",
    "Commercial Yacht Code",
    "Minimum Safe Manning",
    "Indicative Processing Time",
    "Initial Registration Fee",
    "Annual / Renewal Fee",
    "Other Confirmed Fees",
    "VAT / Tax Note",
    "Crew Note",
    "Required Documents Summary",
    "Objective Advantages",
    "Limitations / Risks",
    "Main Official Source",
    "Fee Source",
    "Last Verified",
    "Confidence",
    "Coverage Status",
    "Missing / Next Verification",
]

FEE_COLUMNS = [
    "Flag",
    "Registration Type",
    "Fee Component",
    "Amount",
    "Currency",
    "Basis / Formula",
    "Notes",
    "Official Source",
    "Last Verified",
]

SOURCE_COLUMNS = ["Flag", "Topic", "Source Type", "Official URL", "Last Checked"]

FLAG_ASSET_SOURCE = "flag-icons@7.5.0"
FLAG_ASSET_LICENSE = "MIT"
FLAG_ASSET_UPDATED_AT = "2026-07-27"

FLAG_ASSET_MAPPING = {
    "cayman-islands": ("ky", "Flag of the Cayman Islands", None, None),
    "malta": ("mt", "Flag of Malta", None, None),
    "marshall-islands": ("mh", "Flag of the Marshall Islands", None, None),
    "isle-of-man": ("im", "Flag of the Isle of Man", None, None),
    "jersey": ("je", "Flag of Jersey", None, None),
    "guernsey": ("gg", "Flag of Guernsey", None, None),
    "gibraltar": ("gi", "Flag of Gibraltar", None, None),
    "united-kingdom": ("gb", "Flag of the United Kingdom", None, None),
    "france": ("fr", "Flag of France", None, None),
    "italy": ("it", "Flag of Italy", None, None),
    "spain": ("es", "Flag of Spain", None, None),
    "netherlands": ("nl", "Flag of the Netherlands", None, None),
    "portugal": ("pt", "Flag of Portugal", None, None),
    "madeira": ("pt", "Portuguese flag - Madeira International Shipping Register", "MAR", "Yachts registered in MAR fly the Portuguese flag."),
    "madeira-mar": ("pt", "Portuguese flag - Madeira International Shipping Register", "MAR", "Yachts registered in MAR fly the Portuguese flag."),
    "cyprus": ("cy", "Flag of Cyprus", None, None),
    "panama": ("pa", "Flag of Panama", None, None),
    "belize": ("bz", "Flag of Belize", None, None),
    "jamaica": ("jm", "Flag of Jamaica", None, None),
    "cook-islands": ("ck", "Flag of the Cook Islands", None, None),
    "san-marino": ("sm", "Flag of San Marino", None, None),
    "luxembourg": ("lu", "Flag of Luxembourg", None, None),
}


def cell_text(cell: ET.Element, shared_strings: list[str]) -> str:
    value = cell.find("a:v", NS)
    if value is None or value.text is None:
        inline = cell.find("a:is/a:t", NS)
        return inline.text if inline is not None and inline.text else ""
    raw = value.text
    if cell.attrib.get("t") == "s":
        try:
            return shared_strings[int(raw)]
        except (ValueError, IndexError):
            return ""
    return raw


def column_index(ref: str) -> int:
    letters = "".join(ch for ch in ref if ch.isalpha()).upper()
    value = 0
    for ch in letters:
        value = value * 26 + (ord(ch) - 64)
    return max(0, value - 1)


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    out: list[str] = []
    for si in root.findall("a:si", NS):
        parts = [t.text or "" for t in si.findall(".//a:t", NS)]
        out.append("".join(parts))
    return out


def workbook_sheet_paths(zf: zipfile.ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_by_id = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("rel:Relationship", NS)}
    result: dict[str, str] = {}
    for sheet in workbook.findall("a:sheets/a:sheet", NS):
        name = sheet.attrib["name"]
        rid = sheet.attrib[f"{{{NS['r']}}}id"]
        target = rel_by_id[rid]
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        result[name] = target
    return result


def read_sheet(zf: zipfile.ZipFile, path: str, shared_strings: list[str]) -> list[list[str]]:
    root = ET.fromstring(zf.read(path))
    rows: list[list[str]] = []
    for row in root.findall(".//a:sheetData/a:row", NS):
        values: dict[int, str] = {}
        max_idx = -1
        for cell in row.findall("a:c", NS):
            idx = column_index(cell.attrib.get("r", "A1"))
            values[idx] = cell_text(cell, shared_strings).strip()
            max_idx = max(max_idx, idx)
        rows.append([values.get(i, "") for i in range(max_idx + 1)])
    return rows


def read_workbook(path: Path) -> dict[str, list[dict[str, str]]]:
    with zipfile.ZipFile(path) as zf:
        shared = read_shared_strings(zf)
        sheet_paths = workbook_sheet_paths(zf)
        missing = [name for name in REQUIRED_SHEETS if name not in sheet_paths]
        if missing:
            raise ValueError(f"Missing required worksheet(s): {', '.join(missing)}")

        workbook: dict[str, list[dict[str, str]]] = {}
        for sheet, sheet_path in sheet_paths.items():
            raw_rows = read_sheet(zf, sheet_path, shared)
            header_idx = 0
            if sheet == "Overview":
                workbook[sheet] = []
                continue
            for i, row in enumerate(raw_rows):
                if any(cell.strip() for cell in row):
                    header_idx = i
                    break
            headers = raw_rows[header_idx]
            data_rows = []
            for row in raw_rows[header_idx + 1 :]:
                if not any(cell.strip() for cell in row):
                    continue
                item = {headers[i]: row[i] if i < len(row) else "" for i in range(len(headers)) if headers[i]}
                data_rows.append(item)
            workbook[sheet] = data_rows
    return workbook


def require_columns(rows: list[dict[str, str]], columns: list[str], sheet: str) -> None:
    actual = set(rows[0].keys() if rows else columns)
    missing = [col for col in columns if col not in actual]
    if missing:
        raise ValueError(f"{sheet}: missing required column(s): {', '.join(missing)}")


def slugify(value: str) -> str:
    text = value.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "unknown"


def sql(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    return "'" + text.replace("'", "''") + "'"


def json_sql(value: Any) -> str:
    return sql(json.dumps(value, ensure_ascii=False, sort_keys=True)) + "::jsonb"


def normalize_text(value: str) -> str | None:
    value = (value or "").strip()
    return value or None


def normalize_bool(value: str) -> bool | None:
    text = (value or "").strip().lower()
    if text in {"yes", "y", "true"}:
        return True
    if text in {"no", "n", "false"}:
        return False
    return None


def normalize_status(value: str) -> str:
    text = (value or "").strip().lower()
    if text in {"yes", "y", "true"}:
        return "yes"
    if text in {"no", "n", "false"}:
        return "no"
    if "not applicable" in text or text in {"n/a", "na"}:
        return "not_applicable"
    if "not confirmed" in text or "unconfirmed" in text:
        return "not_confirmed"
    if "case" in text or "depends" in text:
        return "case_dependent"
    if "quote" in text:
        return "quote_required"
    if "partial" in text:
        return "partial"
    return "case_dependent" if text else "not_confirmed"


def parse_amount(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return "null"
    cleaned = re.sub(r"[^0-9.\-]", "", text)
    if not cleaned:
        return "null"
    try:
        return str(float(cleaned))
    except ValueError:
        return "null"


def normalize_date(value: str) -> str | None:
    text = (value or "").strip()
    if not text:
        return None
    try:
        serial = float(text)
        if serial > 20000:
            base = dt.datetime(1899, 12, 30)
            return (base + dt.timedelta(days=serial)).date().isoformat()
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return dt.datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def csv_list(value: str) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in re.split(r";|\n", value) if part.strip()]


def data_quality(row: dict[str, str]) -> tuple[int, str]:
    checks = [
        bool(row.get("Main Official Source")),
        normalize_status(row.get("Private Registration", "")) != "not_confirmed",
        normalize_status(row.get("Commercial Registration", "")) != "not_confirmed",
        bool(row.get("Owner Eligibility")),
        normalize_status(row.get("Local / Resident Agent", "")) != "not_confirmed",
        normalize_status(row.get("Mortgage Registration", "")) != "not_confirmed",
        bool(row.get("Classification Requirement") or row.get("Survey / Inspection")),
        bool(row.get("Initial Registration Fee")),
        bool(row.get("Annual / Renewal Fee")),
        bool(normalize_date(row.get("Last Verified", ""))),
        bool(row.get("Missing / Next Verification")) if "Partial" in row.get("Coverage Status", "") else True,
    ]
    score = round(sum(1 for item in checks if item) / len(checks) * 100)
    coverage = row.get("Coverage Status", "").lower()
    confidence = row.get("Confidence", "").lower()
    if "partial" in coverage:
        return score, "research_required"
    if score >= 88 and "high" in confidence and "verified" in coverage:
        return score, "production_ready"
    if score >= 68:
        return score, "usable_with_warnings"
    return score, "research_required"


def registry_sql(row: dict[str, str], source_version: str) -> str:
    flag = row["Flag"].strip()
    slug = slugify(flag)
    score, quality = data_quality(row)
    asset = FLAG_ASSET_MAPPING.get(slug)
    if not asset:
        raise ValueError(f"No flag asset mapping for registry: {flag}")
    flag_code, flag_alt_text, registry_badge, flag_note = asset
    values = {
        "code": slug,
        "slug": slug,
        "import_key": f"flag:{slug}",
        "flag_name": flag,
        "country": row.get("Country / Territory"),
        "country_or_territory": row.get("Country / Territory"),
        "official_registry_name": row.get("Official Registry"),
        "registry_type": (row.get("Registry Family") or "open").lower(),
        "registry_family": row.get("Registry Family"),
        "is_eu_flag": normalize_bool(row.get("EU Flag", "")),
        "private_available": normalize_status(row.get("Private Registration", "")) == "yes",
        "commercial_available": normalize_status(row.get("Commercial Registration", "")) == "yes",
        "private_registration_status": normalize_status(row.get("Private Registration", "")),
        "commercial_registration_status": normalize_status(row.get("Commercial Registration", "")),
        "private_minimum_loa": row.get("Private Minimum LOA"),
        "commercial_minimum_loa": row.get("Commercial Minimum LOA"),
        "maximum_loa_gt_notes": row.get("Maximum LOA / GT"),
        "passenger_limit_notes": row.get("Passenger Limit"),
        "provisional_registration_status": normalize_status(row.get("Provisional / Interim", "")),
        "provisional_validity": row.get("Provisional Validity"),
        "permanent_validity": row.get("Permanent Validity / Renewal"),
        "owner_eligibility": row.get("Owner Eligibility"),
        "foreign_company_ownership": row.get("Foreign Company Ownership"),
        "local_agent_requirement": row.get("Local / Resident Agent"),
        "mortgage_registration_status": normalize_status(row.get("Mortgage Registration", "")),
        "radio_licence_requirement": row.get("Radio Licence"),
        "classification_requirement": row.get("Classification Requirement"),
        "survey_inspection_requirement": row.get("Survey / Inspection"),
        "commercial_yacht_code": row.get("Commercial Yacht Code"),
        "minimum_safe_manning": row.get("Minimum Safe Manning"),
        "indicative_processing_time": row.get("Indicative Processing Time"),
        "vat_tax_note": row.get("VAT / Tax Note"),
        "crew_note": row.get("Crew Note"),
        "required_documents_summary": row.get("Required Documents Summary"),
        "objective_advantages": row.get("Objective Advantages"),
        "limitations_and_risks": row.get("Limitations / Risks"),
        "official_registry_url": row.get("Main Official Source"),
        "primary_fee_url": row.get("Fee Source"),
        "official_website": row.get("Main Official Source"),
        "flag_code": flag_code,
        "flag_asset_key": flag_code,
        "flag_asset_path": f"/assets/flags/4x3/{flag_code}.svg",
        "flag_alt_text": flag_alt_text,
        "registry_badge": registry_badge,
        "flag_note": flag_note,
        "flag_asset_source": FLAG_ASSET_SOURCE,
        "flag_asset_license": FLAG_ASSET_LICENSE,
        "flag_asset_updated_at": FLAG_ASSET_UPDATED_AT,
        "vat_notes": row.get("VAT / Tax Note"),
        "crew_restrictions": row.get("Crew Note"),
        "advantages": csv_list(row.get("Objective Advantages", "")),
        "disadvantages": csv_list(row.get("Limitations / Risks", "")),
        "confidence_level": row.get("Confidence"),
        "coverage_status": row.get("Coverage Status"),
        "missing_verification_notes": row.get("Missing / Next Verification"),
        "verification_notes": row.get("Missing / Next Verification"),
        "last_verified_at": normalize_date(row.get("Last Verified", "")),
        "last_updated": normalize_date(row.get("Last Verified", "")),
        "source_version": source_version,
        "data_quality_score": score,
        "data_quality_status": quality,
        "original_row": row,
        "active": True,
    }
    cols = list(values.keys())
    vals = [json_sql(values[c]) if isinstance(values[c], (list, dict)) else sql(normalize_text(values[c]) if isinstance(values[c], str) else values[c]) for c in cols]
    updates = ", ".join(f"{c}=excluded.{c}" for c in cols if c not in {"code", "slug", "import_key"})
    return (
        f"insert into public.flag_registries ({', '.join(cols)}) values ({', '.join(vals)}) "
        f"on conflict (import_key) do update set {updates}, updated_at=now();"
    )


def source_sql(row: dict[str, str], source_version: str) -> str:
    slug = slugify(row["Flag"])
    url = row.get("Official URL", "").strip()
    topic = row.get("Topic", "").strip() or "General"
    import_key = f"source:{slug}:{slugify(topic)}:{hashlib.sha1(url.encode()).hexdigest()[:10]}"
    return f"""
insert into public.flag_sources (
  flag_registry_id, topic, source_type, source_title, official_url, checked_at,
  is_official, is_active, source_version, import_key
)
select fr.id, {sql(topic)}, {sql(row.get('Source Type'))}, {sql(topic)}, {sql(url)}, {sql(normalize_date(row.get('Last Checked', '')))},
       true, true, {sql(source_version)}, {sql(import_key)}
  from public.flag_registries fr
 where fr.import_key = {sql('flag:' + slug)}
on conflict (import_key) do update set
  topic=excluded.topic,
  source_type=excluded.source_type,
  source_title=excluded.source_title,
  official_url=excluded.official_url,
  checked_at=excluded.checked_at,
  source_version=excluded.source_version,
  updated_at=now();""".strip()


def fee_sql(row: dict[str, str], source_version: str) -> str:
    slug = slugify(row["Flag"])
    fee_component = row.get("Fee Component", "").strip()
    registration_type = row.get("Registration Type", "").strip()
    source_url = row.get("Official Source", "").strip()
    key_seed = "|".join([slug, registration_type, fee_component, row.get("Currency", ""), row.get("Basis / Formula", ""), source_url])
    import_key = f"fee:{hashlib.sha1(key_seed.encode()).hexdigest()}"
    currency = (row.get("Currency", "") or "").strip().upper() or None
    if currency and not re.match(r"^[A-Z]{3}$", currency):
        raise ValueError(f"Invalid currency for {row.get('Flag')} / {fee_component}: {currency}")
    return f"""
insert into public.flag_fee_rules (
  flag_registry_id, registration_type, fee_component, amount, currency,
  formula_text, notes, official_source_url, confidence_level, last_verified_at,
  is_active, source_version, import_key, original_row
)
select fr.id, {sql(registration_type)}, {sql(fee_component)}, {parse_amount(row.get('Amount', ''))}, {sql(currency)},
       {sql(row.get('Basis / Formula'))}, {sql(row.get('Notes'))}, {sql(source_url)}, null,
       {sql(normalize_date(row.get('Last Verified', '')))}, true, {sql(source_version)},
       {sql(import_key)}, {json_sql(row)}
  from public.flag_registries fr
 where fr.import_key = {sql('flag:' + slug)}
on conflict (import_key) do update set
  registration_type=excluded.registration_type,
  fee_component=excluded.fee_component,
  amount=excluded.amount,
  currency=excluded.currency,
  formula_text=excluded.formula_text,
  notes=excluded.notes,
  official_source_url=excluded.official_source_url,
  last_verified_at=excluded.last_verified_at,
  source_version=excluded.source_version,
  original_row=excluded.original_row,
  updated_at=now();""".strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--out", type=Path, default=Path("exports/flag_advisor"))
    parser.add_argument("--source-version", default="Yachtworth_Flag_Registry_Base_v1")
    args = parser.parse_args()

    if not args.workbook.exists():
        raise SystemExit(f"Workbook not found: {args.workbook}")

    workbook_hash = hashlib.sha256(args.workbook.read_bytes()).hexdigest()
    workbook = read_workbook(args.workbook)
    require_columns(workbook["Flag_Master"], FLAG_COLUMNS, "Flag_Master")
    require_columns(workbook["Fee_Schedules"], FEE_COLUMNS, "Fee_Schedules")
    require_columns(workbook["Source_Index"], SOURCE_COLUMNS, "Source_Index")

    flag_names = [row["Flag"].strip() for row in workbook["Flag_Master"] if row.get("Flag", "").strip()]
    duplicates = sorted({name for name in flag_names if flag_names.count(name) > 1})
    if duplicates:
        raise SystemExit(f"Duplicate registry rows: {', '.join(duplicates)}")

    args.out.mkdir(parents=True, exist_ok=True)
    sql_path = args.out / "flag_advisor_import.sql"
    report_path = args.out / "flag_advisor_import_report.json"

    statements: list[str] = [
        "begin;",
        f"insert into public.flag_import_runs (filename, file_hash, source_version, imported_by, status) values ({sql(args.workbook.name)}, {sql(workbook_hash)}, {sql(args.source_version)}, 'script', 'started') on conflict do nothing;",
    ]

    for row in workbook["Flag_Master"]:
        if row.get("Flag", "").strip():
            statements.append(registry_sql(row, args.source_version))
    for row in workbook["Source_Index"]:
        if row.get("Flag", "").strip() and row.get("Official URL", "").strip():
            statements.append(source_sql(row, args.source_version))
    for row in workbook["Fee_Schedules"]:
        if row.get("Flag", "").strip() and row.get("Fee Component", "").strip():
            statements.append(fee_sql(row, args.source_version))

    summary = {
        "filename": args.workbook.name,
        "file_hash": workbook_hash,
        "source_version": args.source_version,
        "flags": len(flag_names),
        "fees": len([r for r in workbook["Fee_Schedules"] if r.get("Flag", "").strip() and r.get("Fee Component", "").strip()]),
        "sources": len([r for r in workbook["Source_Index"] if r.get("Flag", "").strip() and r.get("Official URL", "").strip()]),
        "generated_at": dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "sql_file": str(sql_path),
    }
    statements.append(
        "insert into public.flag_import_runs (filename, file_hash, source_version, completed_at, imported_rows, updated_rows, skipped_rows, failed_rows, errors, imported_by, status, report) "
        f"values ({sql(args.workbook.name)}, {sql(workbook_hash)}, {sql(args.source_version)}, now(), {summary['flags'] + summary['fees'] + summary['sources']}, 0, 0, 0, '[]'::jsonb, 'script', 'completed', {json_sql(summary)});"
    )
    statements.append("commit;")

    sql_path.write_text("\n\n".join(statements) + "\n", encoding="utf-8")
    report_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
