---
version: 1
slug: "landing"
primary_target: "landing"
related_targets: []
---

# Surface: Landing page

Scope: marketing/landing page at `/`, not signed in. Visitor mode: **Persuade**.

Audience: the freelancer or early-stage founder named in PRODUCT.md — about to accept a document they cannot negotiate, no lawyer, price-resistant to the $650–$870 review baseline.

Job: understand in one viewport what Redline actually shows them (ranked flags, each citing an exact sentence) and act on the one thing this page offers — try it on a document.

Proof/content: a demonstrated contract turning into ranked, cited flags. No real customers, prices, or quotes exist — any example clause/document used as demonstration material is fictional and must read as such, never presented as a real case (see PRODUCT.md "Evidence on Hand").

Constraints (from the brief and PRD.md, non-negotiable):
- One action only: try it on a document. No pricing, no login CTA framed as primary.
- No verdict on whether to sign, no legal advice framing.
- No mention of scanned/photographed documents — client-side text extraction only.
- No document types beyond what PRD.md serves (freelance/consulting agreements, leases, ToS) — do not imply SaaS-vendor-contract or job-offer tuning.
- Real product name "Redline." No invented prices, customers, or quotes.
- Copy must pass the humanizer skill before commit (CLAUDE.md).

## Direction contract

THESIS: Every flag is an examined claim element, not a marketing bullet — the page proves the citation mechanism by showing a real-looking clause broken down and stamped, refusing the gradient-hero "AI reviews your contract" arrangement entirely.

OWN-WORLD: Claim Chart — a patent examiner's office action. Onion-skin cream ground (#f2ede2), typewriter black ink (#1d1b18), a rationed verdict-red (#a6291f) that only ever marks Critical, a quieter ochre (#b8802e) for Serious. Two-column ruled ledger typography: tabular monospace numerals for element/count digits, a plain humanist body face for prose, verdict stamps as the only heavy ink. Color never floods a row — it rides a hairline stamp or rule only (quiet spectrum banding).

STORY: A visitor lands, sees a real-looking contract clause break into numbered elements with a stamped verdict and its quoted sentence beneath — in seconds, they understand "this is not a summary, it's checked against my own words" — then scrolls through a short, plain-language explanation of the three tiers and the citation guarantee, and hits the single action: try it on a document.

FIRST VIEWPORT: A single clause card dominates, left column the clause broken into 2–3 numbered elements, right column running a matching stamped row per element (one stamped red for a Critical example, others quieter ink), the exact quoted sentence set in oversized display type beneath the stamped row as the actual proof — not a caption. Headline sits above or beside this demonstration, not replacing it. Primary action ("Try it on a document") sits directly below the demonstration, not buried in a nav bar.

FORM: Assigned direction from the direction round (seed key 3b76eac0, index 4 of the round-2 grounded list), chosen by the user on the decision page over "Squawk Sheet" (IMPECCABLE'S PICK) and the category-standard canon.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

None outstanding for this build — mode, audience, action, exclusions, and world are all confirmed above.
