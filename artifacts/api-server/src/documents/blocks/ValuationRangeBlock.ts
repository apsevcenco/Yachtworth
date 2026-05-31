import type { DocBlock } from "../core/types";
import { metricCardsHtml, type MetricCard } from "./MetricCardsBlock";

/** Valuation result: section header + Low/Mid/High cards + optional confidence bar. */
export function ValuationRangeBlock(input: {
  heading: string;
  valueHeading: string;
  cards: MetricCard[];
  confidence?: { label: string; pct: number } | null;
}): DocBlock {
  const { heading, valueHeading, cards, confidence } = input;

  const confBlock = confidence
    ? `<div class="conf">
        <div class="conf-head">${confidence.label}</div>
        <div class="conf-bar"><div class="conf-fill" style="width:${confidence.pct}%"></div></div>
        <div class="conf-val">${confidence.pct}%</div>
      </div>`
    : "";

  const html = `<div class="eyebrow">${heading}</div><div class="val-head">${valueHeading}</div>${metricCardsHtml(
    cards,
  )}${confBlock}`;

  const estimatedHeight = 16 + 14 + 52 + (confidence ? 30 : 0);

  return { id: "valuation-range", type: "valuation-range", estimatedHeight, html };
}
