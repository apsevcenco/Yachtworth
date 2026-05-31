import type { DocBlock } from "../core/types";

export interface ComparableRow {
  /** Pre-escaped title (name · builder · model). */
  title: string;
  /** Pre-escaped sub-line (year · length · location — notes). */
  sub?: string;
  /** Pre-escaped source label. */
  source?: string;
  /** Pre-escaped, currency-formatted price. */
  price: string;
}

/** One (possibly chunked) comparables table. `heading` may carry an "— n/N" suffix. */
export function ComparableYachtsBlock(input: {
  id: string;
  heading: string;
  rows: ComparableRow[];
}): DocBlock {
  const body = input.rows
    .map(
      (r) => `<tr>
        <td class="cmp-name">${r.title}${r.sub ? `<div class="cmp-sub">${r.sub}</div>` : ""}${
          r.source ? `<div class="cmp-src">${r.source}</div>` : ""
        }</td>
        <td class="cmp-price">${r.price}</td>
      </tr>`,
    )
    .join("");

  const html = `<div class="eyebrow">${input.heading}</div><table class="cmp">${body}</table>`;
  const estimatedHeight = 16 + input.rows.length * 16;

  return { id: input.id, type: "comparables", estimatedHeight, html };
}
