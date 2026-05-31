import type { DocBlock } from "../core/types";

/** Full-bleed cover. Always standalone and exempt from the fill check. */
export function CoverBlock(input: {
  /** Pre-escaped https photo URL, or undefined for the solid-colour cover. */
  coverPhoto?: string;
  eyebrow: string;
  name: string;
  subtitle?: string;
  date: string;
  cells: { label: string; value: string }[];
  price?: string;
}): DocBlock {
  const { coverPhoto, eyebrow, name, subtitle, date, cells, price } = input;
  const html = `<div class="cover">
    ${coverPhoto ? `<img class="cover-photo" src="${coverPhoto}" />` : ""}
    ${coverPhoto ? `<div class="cover-overlay"></div>` : ""}
    <div class="cover-date">${date}</div>
    <div class="cover-inner">
      <div class="cover-eyebrow">${eyebrow}</div>
      <h1 class="cover-name">${name}</h1>
      ${subtitle ? `<div class="cover-sub">${subtitle}</div>` : ""}
      ${
        cells.length
          ? `<div class="cover-grid">${cells
              .map(
                (c) =>
                  `<div class="cover-cell"><div class="cl">${c.label}</div><div class="cv">${c.value}</div></div>`,
              )
              .join("")}</div>`
          : ""
      }
      ${price ? `<div class="cover-price">${price}</div>` : ""}
    </div>
  </div>`;

  return {
    id: "cover",
    type: "cover",
    estimatedHeight: 265,
    standalone: true,
    fillExempt: true,
    html,
  };
}
