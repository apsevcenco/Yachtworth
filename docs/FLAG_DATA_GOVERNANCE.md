# Flag Data Governance

## Source Hierarchy

Preferred sources:

1. Official flag registry websites and statutory fee schedules.
2. Government maritime authority pages.
3. Official forms and circulars.
4. Recognised classification or code documents.
5. Professional legal/registration advisers, clearly marked as non-official.

Private agent package prices must not replace official registry fees.

## Verification Process

Every fact should retain:

- source URL;
- source topic;
- checked date;
- confidence level;
- coverage status;
- missing-verification notes where applicable.

Do not convert missing or unclear data into a definitive yes/no statement.

## Fee Versioning

When a fee changes:

- close the old row with `effective_to`;
- create a new active row;
- keep original formula text;
- preserve currency exactly as supplied;
- link the fee to an official source when possible.

## Conflicting Sources

If two sources conflict:

- keep the official registry source as primary;
- record the conflict in notes;
- lower confidence until resolved;
- avoid automated calculations based on conflicted data.

## Missing Information

Use explicit labels:

- `not_confirmed`
- `case_dependent`
- `quote_required`
- `partial`

Missing fee information should appear as missing or quote-required, not zero.

## Review Cadence

Recommended review:

- high-use registries: every 90 days;
- medium-use registries: every 180 days;
- low-use registries: annually;
- immediate review when a registry publishes a new fee schedule or yacht code update.

## Audit Requirements

Important changes must create a `flag_change_log` record with:

- entity type;
- previous value;
- new value;
- changed by;
- reason;
- source reference where available.

Workbook imports must create a `flag_import_runs` record with filename and hash.

## Legal And Tax Disclaimer

Flag Advisor is an intelligence and workflow tool. It does not provide binding legal, tax, VAT, customs, insurance, banking, class or crewing advice. Final decisions must be confirmed with qualified professional advisers and the relevant flag registry.
