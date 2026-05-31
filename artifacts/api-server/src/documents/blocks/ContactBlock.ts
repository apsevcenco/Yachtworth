import type { DocBlock } from "../core/types";

/** "Prepared By" contact block. Returns null when there is nothing to show. */
export function ContactBlock(input: {
  heading: string;
  rows: [string, string][];
}): DocBlock | null {
  if (input.rows.length === 0) return null;

  const table = `<table class="spec">${input.rows
    .map(([l, v]) => `<tr><td class="spec-l">${l}</td><td class="spec-v">${v}</td></tr>`)
    .join("")}</table>`;

  const html = `<div class="contact"><div class="eyebrow">${input.heading}</div>${table}</div>`;
  const estimatedHeight = 16 + input.rows.length * 7.5;

  return { id: "contact", type: "contact", estimatedHeight, html };
}
