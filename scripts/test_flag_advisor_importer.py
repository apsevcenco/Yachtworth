#!/usr/bin/env python3

import importlib.util
import re
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "flag_importer",
    ROOT / "scripts" / "import_flag_advisor_workbook.py",
)
assert SPEC and SPEC.loader
flag_importer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(flag_importer)


def write_minimal_xlsx(path: Path, sheets: dict[str, list[list[str]]]) -> None:
    rels = []
    sheet_entries = []
    content_overrides = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    ]
    with zipfile.ZipFile(path, "w") as zf:
        for idx, (name, rows) in enumerate(sheets.items(), start=1):
            rels.append(f'<Relationship Id="rId{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{idx}.xml"/>')
            sheet_entries.append(f'<sheet name="{name}" sheetId="{idx}" r:id="rId{idx}"/>')
            content_overrides.append(f'<Override PartName="/xl/worksheets/sheet{idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
            row_xml = []
            for r_idx, row in enumerate(rows, start=1):
                cells = []
                for c_idx, value in enumerate(row):
                    col = chr(ord("A") + c_idx)
                    cells.append(f'<c r="{col}{r_idx}" t="inlineStr"><is><t>{value}</t></is></c>')
                row_xml.append(f'<row r="{r_idx}">{"".join(cells)}</row>')
            zf.writestr(
                f"xl/worksheets/sheet{idx}.xml",
                f'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>{"".join(row_xml)}</sheetData></worksheet>',
            )
        content_overrides.append("</Types>")
        zf.writestr("[Content_Types].xml", "".join(content_overrides))
        zf.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdWorkbook" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        )
        zf.writestr(
            "xl/workbook.xml",
            f'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>{"".join(sheet_entries)}</sheets></workbook>',
        )
        zf.writestr(
            "xl/_rels/workbook.xml.rels",
            f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{"".join(rels)}</Relationships>',
        )


class FlagAdvisorImporterTests(unittest.TestCase):
    def test_all_expected_flag_assets_exist(self) -> None:
        expected = {
            "ky",
            "mt",
            "mh",
            "im",
            "je",
            "gg",
            "gi",
            "gb",
            "fr",
            "it",
            "es",
            "nl",
            "pt",
            "cy",
            "pa",
            "bz",
            "jm",
            "ck",
            "sm",
            "lu",
        }
        asset_dir = ROOT / "artifacts" / "yachtworth-app" / "assets" / "flags" / "4x3"
        for code in expected:
            self.assertTrue((asset_dir / f"{code}.svg").exists(), f"Missing {code}.svg")

    def test_exact_flag_asset_mapping(self) -> None:
        mapping = flag_importer.FLAG_ASSET_MAPPING
        self.assertEqual(mapping["cayman-islands"][0], "ky")
        self.assertEqual(mapping["malta"][0], "mt")
        self.assertEqual(mapping["isle-of-man"][0], "im")
        self.assertEqual(mapping["jersey"][0], "je")
        self.assertEqual(mapping["guernsey"][0], "gg")
        self.assertEqual(mapping["gibraltar"][0], "gi")
        self.assertEqual(mapping["cook-islands"][0], "ck")
        self.assertEqual(mapping["madeira-mar"][0], "pt")
        self.assertEqual(mapping["madeira-mar"][2], "MAR")
        self.assertNotIn("madeira.svg", str(mapping["madeira-mar"]))

    def test_registry_sql_preserves_flag_asset_fields(self) -> None:
        row = {col: "" for col in flag_importer.FLAG_COLUMNS}
        row.update({
            "Flag": "Madeira (MAR)",
            "Country / Territory": "Portugal",
            "Official Registry": "Madeira International Shipping Register",
            "Registry Family": "International",
            "EU Flag": "Yes",
            "Private Registration": "Yes",
            "Commercial Registration": "Yes",
            "Main Official Source": "https://example.com",
            "Confidence": "High",
            "Coverage Status": "Verified",
            "Last Verified": "2026-07-27",
        })
        sql = flag_importer.registry_sql(row, "test")
        self.assertIn("flag_code", sql)
        self.assertIn("/assets/flags/4x3/pt.svg", sql)
        self.assertIn("'MAR'", sql)
        self.assertIn("Yachts registered in MAR fly the Portuguese flag.", sql)

    def test_flag_ui_uses_local_component_not_cdn_or_emoji(self) -> None:
        app_file = ROOT / "artifacts" / "yachtworth-app" / "app" / "flag-intelligence.tsx"
        admin_file = ROOT / "artifacts" / "yachtworth-app" / "app" / "flag-admin.tsx"
        combined = app_file.read_text(encoding="utf-8") + admin_file.read_text(encoding="utf-8")
        self.assertIn("<RegistryFlag", combined)
        self.assertNotRegex(combined, re.compile(r"https?://.*flag", re.IGNORECASE))
        self.assertNotRegex(combined, re.compile("[\U0001F1E6-\U0001F1FF]{2}"))

    def test_missing_worksheet_fails(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "bad.xlsx"
            write_minimal_xlsx(path, {"Flag_Master": [["Flag"], ["Test"]]})
            with self.assertRaises(ValueError):
                flag_importer.read_workbook(path)

    def test_missing_required_column_fails(self) -> None:
        with self.assertRaises(ValueError):
            flag_importer.require_columns([{"Flag": "Test"}], flag_importer.FLAG_COLUMNS, "Flag_Master")

    def test_invalid_currency_fails(self) -> None:
        row = {
            "Flag": "Test Flag",
            "Registration Type": "Private",
            "Fee Component": "Initial",
            "Amount": "100",
            "Currency": "EURO",
            "Basis / Formula": "Fixed",
            "Notes": "",
            "Official Source": "https://example.com",
            "Last Verified": "2026-07-27",
        }
        with self.assertRaises(ValueError):
            flag_importer.fee_sql(row, "test")

    def test_fixed_formula_and_quote_fee_sql(self) -> None:
        base = {
            "Flag": "Test Flag",
            "Registration Type": "Private",
            "Fee Component": "Initial",
            "Currency": "EUR",
            "Notes": "",
            "Official Source": "https://example.com",
            "Last Verified": "2026-07-27",
        }
        fixed = flag_importer.fee_sql({**base, "Amount": "100", "Basis / Formula": "Fixed"}, "test")
        formula = flag_importer.fee_sql({**base, "Amount": "", "Basis / Formula": "EUR 500 + EUR 2 per GT"}, "test")
        quote = flag_importer.fee_sql({**base, "Amount": "", "Basis / Formula": "Quote required"}, "test")
        self.assertIn("100.0", fixed)
        self.assertIn("EUR 500 + EUR 2 per GT", formula)
        self.assertIn("Quote required", quote)


if __name__ == "__main__":
    unittest.main()
