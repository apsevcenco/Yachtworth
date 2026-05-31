import { adaptiveCss } from "./theme";
import type { DocPage, RenderTheme } from "./types";

/**
 * Render paginated blocks into a complete A4 HTML document.
 *
 * Standalone pages (cover) are emitted bare; packed pages wrap each block in a
 * `.block` element so the CSS `break-inside: avoid` rule keeps each block whole.
 *
 * NOTE: `watermarkText` must already be HTML-escaped by the caller.
 */
export function renderBlocksToHtml(input: {
  pages: DocPage[];
  theme: RenderTheme;
  confidential: boolean;
  watermarkText: string;
}): string {
  const { pages, theme, confidential, watermarkText } = input;

  const body = pages
    .map((p) =>
      p.standalone
        ? `<section class="page cover-page">${p.blocks.map((b) => b.html).join("")}</section>`
        : `<section class="page">${p.blocks
            .map(
              (b) =>
                `<div class="${b.splittable ? "block-flow" : "block"}">${b.html}</div>`,
            )
            .join("")}</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>${adaptiveCss(theme, confidential)}</style></head>
<body>
  ${confidential ? `<div class="watermark">${watermarkText}</div>` : ""}
  ${body}
</body></html>`;
}
