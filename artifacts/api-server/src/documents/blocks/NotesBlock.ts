import type { DocBlock } from "../core/types";

/** Market notes. `bodyHtml` is pre-escaped (newlines already converted to <br/>). */
export function NotesBlock(input: {
  heading: string;
  bodyHtml?: string;
  emptyText: string;
}): DocBlock {
  const { heading, bodyHtml, emptyText } = input;

  const html = `<div class="eyebrow">${heading}</div>${
    bodyHtml
      ? `<div class="notes"><p>${bodyHtml}</p></div>`
      : `<p class="muted">${emptyText}</p>`
  }`;

  const plainLen = bodyHtml ? bodyHtml.replace(/<[^>]+>/g, "").length : 0;
  const lines = Math.max(1, Math.ceil(plainLen / 90));
  const estimatedHeight = 16 + 12 + lines * 5;

  // Long notes may legitimately exceed a page — let them flow rather than
  // forcing the whole block onto one page.
  const block: DocBlock = { id: "notes", type: "notes", estimatedHeight, html };
  if (estimatedHeight > 180) block.splittable = true;
  return block;
}
