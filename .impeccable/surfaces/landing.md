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

Action: one only. "Try it on a document" routes to `/sign-up`. Confirmed with the user: the page carries an operable demonstration of a prepared fictional agreement, and the real-document action goes behind sign-in. No unauthenticated model call, no file handling, no app surface on this page.

Proof/content: a demonstrated contract turning into ranked, cited flags. No real customers, prices, or quotes exist — every example clause and document is fictional and must read as such, never presented as a real case (see PRODUCT.md "Evidence on Hand").

Constraints (from the brief and PRD.md, non-negotiable):
- One action only: try it on a document. No pricing, no login CTA framed as primary.
- No verdict on whether to sign, no legal advice framing.
- No mention of scanned/photographed documents — client-side text extraction only.
- No document types beyond what PRD.md serves (freelance/consulting agreements, leases, ToS) — do not imply SaaS-vendor-contract or job-offer tuning.
- Real product name "Redline." No invented prices, customers, or quotes.
- Copy must pass the humanizer skill before commit (CLAUDE.md).

## Direction history

Round 1 (Exhibit Docket / kraft-and-tab) retired by user re-roll before any build.

Round 2 (Claim Chart / patent-examiner onion-skin and typewriter ink) was built, passed finish review, and got a DESIGN.md. The user then reviewed it and asked for a full re-roll to a different world. **The paper / ledger / office-document family is exhausted for this surface — do not roll back into it.** This exclusion survives every later round.

Round 3 (Card & Review / soccer referee cards plus broadcast VAR graphic) was built dark, corrected to a daylight register after the user objected that dark grounds read as tech-coded to a non-tech audience, and shipped. **The dark register exclusion also survives: do not ship this product on a near-black ground.**

Round 4 (current) — the user chose a full re-roll of the visual world over keeping Card & Review. The roll assigned The Hazard Chart (hydrographic charting); the user locked **The Facts Panel**, presented as IMPECCABLE'S PICK, over that assignment, five declined challengers, one competitive challenger (hand-drawn zine), and the category standard. Card & Review is retired — its referee-card vocabulary, Teko/Inter/JetBrains three-voice split, pitch-green turf edge, and four-call naming are gone. Seed key f053c731, build path code-led.

Two donations carried from the round-4 hand into this direction: severity carried by real scale difference rather than only a colored badge (from the declined Tropicália collage), and provenance stated per region rather than asserted once in a headline (from the declined wax-pack card).

## Direction contract (round 4 — current, supersedes Card & Review)

THESIS: Redline's analysis set in the one typographic system the law already trusts to be read — the Drug Facts panel — so severity arrives as rule weight and the verbatim sentence is the largest type on the page. It refuses the category's centered headline over a browser-framed screenshot, and it refuses three colored badges standing in for a severity model.

OWN-WORLD: The Facts Panel — a saturated pharmacy-carton ground carrying a box-ruled white panel printed in black, the way an OTC carton carries its mandated Drug Facts field. The carton is deep pharmacy green; the panel is uncoated printed white. Severity is rule weight, not a palette: Critical is a boxed warning in brick warning red (the black-box device), Serious is a heavy barline, Worth noting is a hairline. Color is rationed to Critical alone — no second or third tier color exists. A red-line match is a separate signal entirely, never merged into severity: it is a dot-matrix inkjet overprint stamped slightly off-register after printing, in overprint blue. Three voices, each with a job the others cannot do: Archivo and Archivo Narrow as the panel's regulatory grotesque for every heading, label, rule, and body run; Tinos — metrically a Times — for verbatim quoted clauses only, because that is what the source document actually looks like; DotGothic16 for overprint codes and document IDs. Square bullets, zero corner radius anywhere, ragged-right setting, tight leading at panel density.

STORY: A visitor lands on a carton, not a website — one enormous CONTRACT FACTS panel with a fictional freelance agreement already analyzed inside it. They read the plain-English summary where Active Ingredients sits, hit a red boxed warning whose quoted sentence is the biggest type on the page, and select it: the exact sentence marks in the source document beside it. In seconds they understand the flag came out of a real sentence they can check themselves. They scroll through how severity is set, the citation guarantee, their own red lines as overprint, and the panel's own Warnings section — which is where Redline states plainly what it will not do — and reach one action: try it on a document.

FIRST VIEWPORT: Deep pharmacy-green carton ground, full bleed, no nav bar and no hero headline above the panel — the panel is the headline. A white box-ruled panel occupies roughly two-thirds of the width on the left. Its title block reads CONTRACT FACTS in Archivo Black over the mandated heavy barline, with the fictional agreement's name and an overprinted lot code beneath it. Under that: a one-paragraph plain-English summary, then a red-ruled boxed warning — Critical — whose verbatim sentence is set in Tinos at the largest size on the page, with its rationale beneath in the panel's grotesque. To the right sits the source document panel, showing the agreement's actual text in Tinos with the cited sentence marked. The single action, "Try it on a document," sits as a printed carton button directly below the panel's summary block.

SIGNATURE INTERACTION: "The panel prints, then the citation holds." One authored entrance: the panel's barlines draw in left to right, each warning block sets into place heaviest-first (Critical, then Serious, then Worth noting), and each overprint lot code stamps on last, rotated slightly off-register. Exponential ease-out, content visible by default, skipped entirely under `prefers-reduced-motion`. After that the only motion on the page is the citation link — selecting a warning marks its exact sentence in the source document beside it, and selecting a marked sentence brings its warning into view. The two panels never disagree, and no flag is ever shown without its source visible.

FORM: The Facts Panel, ranked first on the grounded list, chosen by the user as IMPECCABLE'S PICK over the assigned Hazard Chart. Seed key f053c731.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

- Exact entrance timing and stagger for "the panel prints" — build-time detail, not decided here beyond "one authored moment, heaviest rule first."
- The severity-as-rule-weight mapping is not negotiable without another round: Critical is the only tier that gets color, and a red-line match never borrows a severity device. Collapsing these into three colored badges would rebuild the exact labeling bug two earlier worlds shipped with.
