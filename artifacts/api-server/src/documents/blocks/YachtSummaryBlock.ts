import type { DocBlock } from "../core/types";

function specTable(rows: [string, string][]): string {
  return `<table class="spec">${rows
    .map(([l, v]) => `<tr><td class="spec-l">${l}</td><td class="spec-v">${v}</td></tr>`)
    .join("")}</table>`;
}

/** Specifications (left) + Accommodation (right), two columns. Rows pre-escaped. */
export function YachtSummaryBlock(input: {
  heading: string;
  accommodationHeading: string;
  specRows: [string, string][];
  accommodationRows: [string, string][];
  emptyText: string;
}): DocBlock {
  const { heading, accommodationHeading, specRows, accommodationRows, emptyText } =
    input;

  const html = `
    <div class="eyebrow">${heading}</div>
    <div class="two-col">
      <div>${specRows.length ? specTable(specRows) : `<p class="muted">${emptyText}</p>`}</div>
      <div>
        <div class="sub-h">${accommodationHeading}</div>
        ${accommodationRows.length ? specTable(accommodationRows) : `<p class="muted">${emptyText}</p>`}
      </div>
    </div>`;

  const tallerColumn = Math.max(specRows.length, accommodationRows.length + 1);
  const estimatedHeight = 18 + tallerColumn * 7.5;

  return { id: "yacht-summary", type: "yacht-summary", estimatedHeight, html };
}
