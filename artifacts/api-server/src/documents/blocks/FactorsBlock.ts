import type { DocBlock } from "../core/types";

export interface FactorRow {
  /** Pre-escaped factor name. */
  name: string;
  /** Pre-escaped note. */
  note?: string;
  /** Impact chip: pre-escaped text + a class (imp-pos | imp-neg | imp-neu). */
  chip?: { text: string; cls: string };
  /** Pre-escaped weight value. */
  weight?: string;
}

/** One (possibly chunked) factors table. `heading` may carry an "— n/N" suffix. */
export function FactorsBlock(input: {
  id: string;
  heading: string;
  rows: FactorRow[];
}): DocBlock {
  const body = input.rows
    .map(
      (r) => `<tr>
        <td class="fct-name">${r.name}${r.note ? `<div class="fct-note">${r.note}</div>` : ""}</td>
        <td class="fct-impact">${
          r.chip ? `<span class="chip ${r.chip.cls}">${r.chip.text}</span>` : ""
        }${r.weight ? `<span class="fw">${r.weight}</span>` : ""}</td>
      </tr>`,
    )
    .join("");

  const html = `<div class="eyebrow">${input.heading}</div><table class="fct">${body}</table>`;
  const estimatedHeight = 16 + input.rows.length * 16;

  return { id: input.id, type: "factors", estimatedHeight, html };
}
