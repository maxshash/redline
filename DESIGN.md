---
name: Redline
description: A patent examiner's claim chart, not a SaaS gradient hero — every flag is an examined claim element, stamped and cited to its exact sentence.
colors:
  paper: "#f2ede2"
  paper-dim: "#e9e2d2"
  paper-shadow: "#d8cfb8"
  ink: "#1d1b18"
  ink-soft: "#4a453c"
  ink-faint: "#8a8371"
  rule: "#c9bfa6"
  critical: "#a6291f"
  critical-ink: "#f2ede2"
  serious: "#8a5a1c"
  serious-ink: "#f2ede2"
  noting: "#55503f"
typography:
  display:
    fontFamily: "Source Serif 4, ui-serif, serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Source Serif 4, ui-serif, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  quote:
    fontFamily: "Source Serif 4, ui-serif, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.375
    letterSpacing: "normal"
  label:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.18em"
rounded:
  none: "0px"
spacing:
  xs: "0.75rem"
  sm: "1.25rem"
  md: "2rem"
  lg: "3rem"
  section: "6rem"
  section-lg: "8rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  stamp-critical:
    backgroundColor: "transparent"
    textColor: "{colors.critical}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
  stamp-serious:
    backgroundColor: "transparent"
    textColor: "{colors.serious}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
  stamp-noting:
    backgroundColor: "transparent"
    textColor: "{colors.noting}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
  stamp-cleared:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
---

# Design System: Redline

## Overview

**Creative North Star: "The Claim Chart"**

Redline's landing page is built as a patent examiner's office action, not a SaaS pitch. Onion-skin paper, typewriter labels, and hairline rules stand in for the gradient hero, glyph icons, and floating cards of the category-standard AI-tool look — that arrangement was considered and deliberately rejected (see the surface brief's FORM note). The page proves its own mechanism instead of describing it: a real-looking clause is broken into numbered elements, each stamped with a verdict and backed by its exact quoted sentence, set oversized as proof rather than caption.

Color is rationed on purpose. Verdict-red exists only to mark Critical; a quieter ochre-brown marks Serious; two distinct dark neutrals separate "Worth noting" from a clause that was checked and cleared. None of these colors ever fill a background — they live only in a thin stamp border and its text, never a flooded row.

**Key Characteristics:**
- Onion-skin cream ground with black typewriter ink, no gradients, no photography, no illustration.
- Two-voice typography: a humanist serif (Source Serif 4) for prose, headlines, and the evidentiary quote; a monospace typewriter face (Courier Prime) reserved for labels, stamps, numbering, and buttons.
- Flat and bordered throughout — 3px hairline-square borders carry structure; no drop shadows anywhere in the shipped page.
- Verdict color is rationed to thin stamp badges only, never a filled background or row tint.

## Colors

The palette is a single desaturated warm-neutral field (paper/ink) with three rationed verdict accents that never leave their stamp badges.

### Primary
- **Verdict Red** (`#a6291f`): the single warm accent, reserved exclusively for the Critical stamp border/text and for `::selection` highlighting. Never used decoratively or on more than one element type.

### Secondary
- **Ochre Serious** (`#8a5a1c`): marks the Serious stamp only. Note: the direction contract specified a lighter ochre (`#b8802e`); the shipped token is a darker, less saturated `#8a5a1c` — the build's value is normative here, the contract's is not.

### Neutral
- **Onion-Skin Paper** (`#f2ede2`): the page background and default surface.
- **Paper Dim** (`#e9e2d2`): recessed/secondary surfaces — the ClauseChart card body and the closing CTA band.
- **Paper Shadow** (`#d8cfb8`): darkest neutral surface step; defined as a token but not yet used in a shipped element — reserve, don't invent a use for it.
- **Typewriter Ink** (`#1d1b18`): primary text color, all borders, and the filled button/header-band background.
- **Ink Soft** (`#4a453c`): secondary body text (subheads, supporting copy) and the "cleared" stamp.
- **Ink Faint** (`#8a8371`): least-emphasis text; scrollbar thumb.
- **Ledger Rule** (`#c9bfa6`): all hairline dividers between rows and sections.
- **Worth-Noting Neutral** (`#55503f`): the fourth verdict color — a dark neutral distinct from both ink-soft and ink, marking "Worth noting" so it reads as a real tier, not a muted version of Critical/Serious.

### Named Rules
**The Rationed Ink Rule.** Verdict color (red, ochre, the two dark neutrals) appears only inside a stamp badge's border and label text — border-and-text, never a filled background, never a row tint, never more than one verdict color per row.

## Typography

**Display Font:** Source Serif 4 (with ui-serif, serif fallback)
**Body Font:** Source Serif 4 (with ui-serif, serif fallback)
**Label/Mono Font:** Courier Prime (with ui-monospace, monospace fallback)

**Character:** One serif does double duty for headline, body, and the italicized evidentiary quote, giving the page a single authored voice; the monospace typewriter face is reserved entirely for structural/administrative marks (labels, numbering, buttons, stamps), so switching to it always signals "this is the apparatus talking, not the document."

### Hierarchy
- **Display** (semibold 600, `clamp(2.25rem, 5vw, 3.75rem)`, line-height 1.08, tracking -0.02em): the single H1 hero line.
- **Headline** (semibold 600, 1.5–1.875rem, tracking -0.01em): section headings ("Three tiers, not a numeric score.").
- **Quote** (regular 400, 1.25–1.5rem, italic, line-height 1.375): the verbatim clause sentence inside the ClauseChart — set oversized as the proof, not a caption.
- **Body** (regular 400, 1–1.125rem, line-height 1.625, max ~68ch): supporting prose throughout.
- **Label** (bold 700, 0.75rem, tracking 0.18em, uppercase, Courier Prime): stamps, nav link, buttons, the header/footer bands of the ClauseChart, element numbering (`§1`).

### Named Rules
**The Two-Voice Rule.** Prose and proof are always set in the serif; anything administrative (a label, a count, a button, a stamp) is always set in the uppercase tracked-out monospace. Never mix the two roles within one text run.

## Layout

A single-column page, no grid system: `max-w-5xl` container, horizontal padding `px-5` (`sm:px-8`). Sections stack with a generous, consistent rhythm — `gap-24`/`py-16` at rest, expanding to `gap-32`/`py-24` at `sm:`. Internal rows and lists use 3px-ruled dividers (`divide-y-[3px] divide-rule`) rather than card-per-item spacing. The one two-column moment is the ClauseChart's element rows and the tier-list rows, which collapse to a stacked single column below `sm:`.

## Elevation & Depth

Flat by design, no exceptions. There are no `box-shadow` declarations anywhere in the shipped page — depth and hierarchy come entirely from a 3px `border-ink` hairline-square border and solid ink-filled bands (the ClauseChart's header/footer), never from a cast shadow. An earlier draft used a hard-offset, zero-blur `box-shadow: 6px 6px 0 0` on the ClauseChart card (a neobrutalist device); it was flagged in finish review and removed. Its absence is now a deliberate invariant, not an oversight.

### Named Rules
**The Flat-and-Bordered Rule.** Depth is never simulated with a shadow of any kind — hard-offset or soft. A surface is either flush with the page or set apart by a 3px ink border. If a component needs to read as "raised," give it a border and an ink-filled band, not a shadow.

## Shapes

Square corners everywhere — no `border-radius` is used on any shipped element. Structure is carried by 3px solid `border-ink` borders on cards, buttons, and section rule-lines, and by thinner ledger-rule (`#c9bfa6`) hairlines between list rows. Stamps are also square-cornered, distinguished only by border color and a slight per-tier rotation (`-3deg` to `2deg`) applied on entry, not by shape.

## Components

### Buttons
- **Shape:** square corners, 3px `border-ink` border, no radius.
- **Primary:** filled `bg-ink`/`text-paper`, Courier Prime uppercase label (`14px 28px` padding, tracking 0.16em).
- **Hover / Focus:** inverts to `bg-paper`/`text-ink` on hover (border stays ink); focus-visible gets a 2px critical-red outline offset 3px, matching the global focus ring.
- No secondary/ghost button variant exists in the build; the nav's "Try it on a document" link is an underlined text link, not a button variant — don't promote it into one.

### Cards / Containers
- **Corner Style:** square, no radius.
- **Background:** `paper-dim` for the ClauseChart body and the closing CTA section; `ink`-filled bands for the ClauseChart's header and footer strips.
- **Shadow Strategy:** none — see Elevation & Depth.
- **Border:** 3px solid ink around the whole container.
- **Internal Padding:** `p-5`/`p-6` per row on the ClauseChart; `p-8`/`p-12` on the closing CTA band.

### Stamp (signature component)
The distinctive, reused component of the system: a verdict badge, never a filled chip. Square corners, 3px border in the tier's verdict color, no fill — label text set in the same color, Courier Prime uppercase, tracking 0.18em. On mount it plays a 520ms `stamp-in` keyframe (scale 1.6 → 1, slight rotation settling to a per-tier tilt, blur-to-sharp), evoking a rubber stamp landing on paper; it respects `prefers-reduced-motion` by skipping straight to the settled state. Four tiers exist — `critical` (red), `serious` (ochre), `noting` (dark neutral `#55503f`), `cleared` (ink-soft `#4a453c`) — and a cleared verdict is a first-class stamp, not an absence of one.

### ClauseChart (signature component)
A single illustrative clause rendered as an office-action ledger: an ink-filled header band naming the source ("Example agreement — Section 4...") and flagging it as illustrative, an ordered list of numbered elements (`§1`, `§2`...) each pairing a Stamp with its oversized quoted sentence and a one-line rationale, and an ink-filled footer band tallying "N examined · N flagged · N cleared" in tabular monospace numerals. This is the page's proof mechanism, not decoration — every other section explains what this component already demonstrated.

### Tier-list row pattern
Used for the three-severity explainer: a ruled list (`divide-y-[3px] divide-rule`, bordered top/bottom) of rows, each pairing a Stamp (fixed-width left column, `10rem`) with its plain-language definition (right column), collapsing to stacked on mobile. The same row shape reappears for the "what this doesn't do" boundary list, substituting an em-dash mark for the Stamp.

## Do's and Don'ts

### Do:
- **Do** keep verdict color inside a stamp's border-and-text only; never fill a row, card, or background with critical/serious/noting color.
- **Do** render a "cleared" verdict as its own stamp (ink-soft border/text), not as the absence of a stamp — a clean result must be as legible as a flagged one.
- **Do** reserve Courier Prime for labels, counts, numbering, and buttons; keep prose and the evidentiary quote in Source Serif 4.
- **Do** use 3px ink borders and ink-filled bands for structure and hierarchy, never a shadow.

### Don't:
- **Don't** reintroduce a box-shadow of any kind (hard-offset or soft) — a `6px 6px 0 0` neobrutalist shadow was tried on the ClauseChart card and removed in finish review; the system is flat-and-bordered, not shadowed.
- **Don't** reach for the gradient-hero "AI reviews your contract" arrangement (hero gradient, floating glass cards, glyph icon set) — that was the rejected category-standard direction, not this world.
- **Don't** round any corner. No `border-radius` appears anywhere in the shipped system.
- **Don't** use the Serious ochre from the original direction contract (`#b8802e`) — the shipped, normative value is `#8a5a1c`.
