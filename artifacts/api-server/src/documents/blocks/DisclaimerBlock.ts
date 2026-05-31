import type { DocBlock } from "../core/types";

/** Italic legal disclaimer. `text` is pre-escaped. */
export function DisclaimerBlock(input: { text: string }): DocBlock {
  return {
    id: "disclaimer",
    type: "disclaimer",
    estimatedHeight: 12,
    html: `<div class="disclaimer">${input.text}</div>`,
  };
}
