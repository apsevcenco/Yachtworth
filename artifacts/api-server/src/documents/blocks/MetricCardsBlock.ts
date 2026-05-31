import type { DocBlock } from "../core/types";

export interface MetricCard {
  label: string;
  value: string;
  emphasis?: boolean;
}

/** Reusable card row (also used inside ValuationRangeBlock). Values pre-escaped. */
export function metricCardsHtml(cards: MetricCard[]): string {
  return `<div class="val-row">${cards
    .map(
      (c) =>
        `<div class="val-box${c.emphasis ? " val-box-mid" : ""}"><div class="val-label">${c.label}</div><div class="val-amount">${c.value}</div></div>`,
    )
    .join("")}</div>`;
}

/** Standalone metric-cards block (heading optional). */
export function MetricCardsBlock(input: {
  heading?: string;
  cards: MetricCard[];
}): DocBlock {
  const html = `${input.heading ? `<div class="val-head">${input.heading}</div>` : ""}${metricCardsHtml(
    input.cards,
  )}`;
  const estimatedHeight = (input.heading ? 12 : 0) + 52;
  return { id: "metric-cards", type: "metric-cards", estimatedHeight, html };
}
