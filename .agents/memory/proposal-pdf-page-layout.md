---
name: Proposal adaptive PDF page layout
description: Where commercial detail belongs in the adaptive proposal PDF, and the cover legibility approach.
---

# Proposal adaptive PDF — commercial detail placement

In the backend adaptive proposal builder (`artifacts/api-server/src/documents/builders/proposal.ts`):

**Rule:** all commercial detail (price cards For Sale / For Charter, VAT, delivery,
sea-trial, charter terms APA/VAT, charter area, contract) lives ONLY on the final
Pricing page — for every `proposal_type` (sale / charter / both). Page 2 is
Specifications + full-width Accommodation, with NO commercial content.

**Why:** an earlier design put a mid-document "Commercial Summary" beside
Accommodation (two-column) for charter/both proposals. It duplicated the price
(already on cover + final page), repeated VAT/delivery/sea-trial, and left an
unbalanced half-column. The owner's accepted patch removed it entirely.

**How to apply:** do not reintroduce commercial cards/rows on page 2. The cover
keeps only a brief price; the final pricing block is the single source.

# Cover legibility

**Rule:** the cover panel uses a bottom-anchored gradient box (`.cover-inner`:
navy gradient `rgba(7,18,38,0.20)`→`0.78`, gold top border) for text contrast over
photos — NOT per-glyph `text-shadow`. Letter-spacing is restrained (`.eyebrow`
1.4px, `.cover-eyebrow` 2.2px).

**Why:** per-glyph text-shadow over photos read as a doubled/blurred glyph; a
single translucent panel gives clean contrast without that artifact.
