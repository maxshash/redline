---
name: Redline
description: A mandated Drug Facts panel printed on a pharmacy carton — severity arrives as rule weight, and the quoted sentence is the largest type on the page.
colors:
  carton: "#0b5340"
  carton-deep: "#07382c"
  carton-ink: "#f0f4f1"
  carton-ink-soft: "#9dbfae"
  panel-field: "#fbfaf7"
  panel-field-hover: "#f6f4ee"
  panel-field-active: "#f1eee6"
  ink: "#141210"
  ink-soft: "#4d4842"
  critical: "#bb1226"
  critical-mark: "#fae3e6"
  overprint: "#1f3fa8"
  overprint-mark: "#dfe4f7"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.015em"
  display-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.015em"
  display-close:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  display-close-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  headline-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  quote-critical:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  quote-critical-sm:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "2.75rem"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "normal"
  quote-serious:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
  quote-serious-sm:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
  quote-noted:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  quote-noted-sm:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  source:
    fontFamily: "Tinos, Times New Roman, Times, serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  body-lead:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  body-small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  label-narrow:
    fontFamily: "Archivo Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.08em"
  label-narrow-tight:
    fontFamily: "Archivo Narrow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.1em"
  overprint:
    fontFamily: "DotGothic16, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  none: "0"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "1.75rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4rem"
  4xl: "6rem"
  container: "86rem"
components:
  panel:
    backgroundColor: "{colors.panel-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1.5rem 1.25rem"
  panel-wide:
    backgroundColor: "{colors.panel-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "2rem"
  button-primary:
    backgroundColor: "{colors.carton}"
    textColor: "{colors.carton-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel-field}"
  button-on-carton:
    backgroundColor: "{colors.carton-ink}"
    textColor: "{colors.carton-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.875rem 1.75rem"
  button-on-carton-hover:
    backgroundColor: "{colors.carton-deep}"
    textColor: "{colors.carton-ink}"
  finding-critical:
    backgroundColor: "{colors.panel-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
  finding-serious:
    backgroundColor: "{colors.panel-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
  finding-noted:
    backgroundColor: "{colors.panel-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
  finding-redline:
    backgroundColor: "{colors.panel-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
  finding-active:
    backgroundColor: "{colors.panel-field-active}"
    textColor: "{colors.ink}"
  finding-hover:
    backgroundColor: "{colors.panel-field-hover}"
    textColor: "{colors.ink}"
---

# Design System: Redline

## Overview

**Creative North Star: "The Facts Panel"**

Redline is printed, not rendered. The page is a saturated pharmacy-carton ground carrying a box-ruled white panel set in black ink, the way an over-the-counter carton carries its mandated Drug Facts field — the one typographic system the law already trusts people to read under pressure. There is no nav bar and no hero headline floating above a screenshot; the panel is the headline, and it arrives already filled in with a fictional agreement Redline has read.

The system's whole argument is that a warning means something only when you can see the sentence it came from. So the two halves of the signature component — the facts panel and the source document beside it — are built as one instrument: selecting a warning marks its exact sentence in the document, and selecting a marked sentence pulls its warning back. Severity is carried by the weight of a rule, never by a badge or a palette, and colour is rationed hard enough that red still means one thing by the time your eye crosses from one panel to the other.

Density is regulatory: tight leading, ragged-right setting, uppercase condensed labels, square bullets, hairlines between rows, and zero corner radius anywhere. Confirmed rejections: the category's centered headline over a browser-framed screenshot; three coloured badges standing in for a severity model; any numeric risk score. A previous world ("Card & Review" — referee cards, broadcast VAR graphic, Teko/Inter/JetBrains Mono, pitch-green turf edge, and the four calls Red Card / Yellow Card / Noted / Play On) is retired and gone from the code; nothing here extends it and it must not be reintroduced.

**Key Characteristics:**
- Pharmacy-carton green ground, uncoated-white panel, black ink
- Severity as rule weight (6px box / 3px rule / 1px hairline), never as a palette
- One accent colour, spent on Critical only
- Red-line matches as a dot-matrix overprint in a second, unrelated ink
- Three typefaces with three non-overlapping jobs
- Verbatim source text is the largest type on the page
- Zero corner radius, square bullets, no shadows

## Colors

Two inks on two stocks: a saturated pharmacy green the carton is printed in, an uncoated white the panel is printed on, and exactly two spot colours that each answer a different question.

### Primary
- **Carton Green** (`{colors.carton}`): The full-bleed ground the whole page sits on, and the fill of the in-panel primary button. This is the carton stock, not a brand wash — it never appears inside a panel except as a printed button.
- **Carton Green Deep** (`{colors.carton-deep}`): The closing band and footer, and the scrollbar track. A second press of the same ink to end the page a shade darker than it started.

### Secondary
- **Warning Red** (`{colors.critical}`): The only tier colour that exists. It draws the Critical boxed warning, sets the word "Critical", tints the selection highlight and the focus ring, and marks the Critical sentence in the source document. Nothing else.
- **Critical Mark** (`{colors.critical-mark}`): The pale wash behind a Critical sentence inside the source document, under a 3px red underline. It exists so a Critical citation is findable while scrolling a wall of Times.

### Tertiary
- **Overprint Blue** (`{colors.overprint}`): The red-line match ink. Dashed underlines on matched runs, the dashed rule on a tierless red-line block, lot codes, document IDs, and the square bullets of the red-line list. It is deliberately not a severity colour and must never be used as one.
- **Overprint Mark** (`{colors.overprint-mark}`): Reserved pale companion to the overprint ink, the blue counterpart of Critical Mark.

### Neutral
- **Panel White** (`{colors.panel-field}`): Uncoated printed stock. Every panel, every card, and the text colour of a hovered primary button.
- **Panel Hover** (`{colors.panel-field-hover}`) and **Panel Selected** (`{colors.panel-field-active}`): The two tints a selectable finding row takes on hover and when it is the active citation. They are the only interaction fills in the system.
- **Ink** (`{colors.ink}`): Near-black press ink. All headings, all rules that are not Critical, panel borders, square bullets.
- **Ink Soft** (`{colors.ink-soft}`): Secondary running text, narrow labels, and metadata inside a panel.
- **Carton Ink** (`{colors.carton-ink}`) and **Carton Ink Soft** (`{colors.carton-ink-soft}`): Type set directly on the green ground — headings and the bordered citation-guarantee band in the first, running text and footer labels in the second.

### Named Rules

**The Rationed Colour Rule.** Colour belongs to Critical alone, and it holds across panels: in the analysis panel Critical is a red box, in the source document the Critical sentence is a red underline over a pale red wash — and every non-Critical citation mark is an ink-weight underline. An earlier build painted every citation mark red and red stopped meaning anything the moment the eye crossed from one panel to the other. Audit test: count the red elements in a screenshot; each one must trace to the same single Critical finding.

**The Second Ink Rule.** A red-line match is an overprint, never a severity device. It is drawn in Overprint Blue as a dashed underline on an inner span, independent of whatever tier rule the parent carries, so a clause that is both Serious and a red-line match shows both signals at once. A red-line match with no tier gets the overprint's own dashed 2px rule and borrows nothing from the severity system.

## Typography

**Display Font:** Archivo (with `ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Archivo; Archivo Narrow for condensed labels and dense ruled rows
**Source Font:** Tinos (with `Times New Roman, Times, serif`)
**Overprint Font:** DotGothic16 (with `ui-monospace, monospace`)

**Character:** A regulatory grotesque at heavy weights does all the talking — uppercase, tightly tracked, set flush left and ragged right at panel density. Against it, quoted contract text is a Times, because that is what the document on your desk actually looks like. The dot-matrix face appears only where something was stamped on after the panel was printed.

### Hierarchy
- **Display** (800, 1.875rem base, stepping to 2.25rem ≥640px, line-height 0.95, tracking -0.015em, uppercase): The panel's own claim. Set to a `max-w` of 20–26ch so it always breaks to three or four dense lines. Two carton-ground statements take the same base at -0.02em tracking: the citation beat steps to 2.25rem ≥640px, and the closing heading steps one further to 2.375rem (`display-close`) because it is the last thing said on the page.
- **Headline** (800, 1.625rem base, stepping to 2rem ≥640px, line-height 0.95, tracking -0.01em, uppercase): Panel section titles that sit over the 7px barline — "Contract Facts", "How a warning gets its weight", "Your own red lines". The sign-up page's "Not open yet" is this role pushed one step (2rem / 2.75rem).
- **Title** (800, 1.25rem, line-height 1, tracking 0.02em, uppercase): The Redline wordmark in a panel masthead. Nothing else uses it.
- **Quote, Critical** (Tinos 400, 1.75rem base at line-height 1.2, stepping to 2.75rem at line-height 1.14 ≥640px): The verbatim sentence inside a Critical boxed warning. This is the largest type on the page and that is the entire point.
- **Quote, Serious** (Tinos 400, 1.125rem base, stepping to 1.375rem ≥640px, line-height 1.35) and **Quote, Worth noting** (Tinos 400, 1rem base, stepping to 1.0625rem ≥640px, line-height 1.45): Real scale difference does the ranking, in step with the rule weight above each block.
- **Source** (Tinos 400, 0.9375rem, line-height 1.7): The agreement's running text in the document panel. Loose leading here is what makes room for underline marks at a 3px offset without collision.
- **Body lead** (400, 1.0625rem, line-height 1.55, max 56–62ch): Running text set on the carton ground.
- **Body** (400, 1rem, line-height 1.5–1.55, max 62–68ch) and **Body small** (400, 0.9375rem, line-height 1.55, max 48–52ch): Running text inside a panel, in Ink Soft. Body small carries findings' rationale and multi-column explanation blocks.
- **Label** (700, 0.9375rem, tracking 0.06em, uppercase): Panel sub-headings and the text of every button. Tier names use it at 0.9375rem in a finding block and 1.0625rem (800, tracking 0.05em) in the severity explainer.
- **Label narrow** (Archivo Narrow 400, 0.8125rem, tracking 0.08em, uppercase): Metadata rows — section references, counts, document names, the footer line.
- **Label narrow tight** (Archivo Narrow 700, 0.75rem, tracking 0.1em, uppercase): Clause numbers and headings inside the source document, where the row must stay out of the way of the Times below it.
- **Overprint** (DotGothic16 400, 0.6875rem, rotated -1.2deg): Lot codes, document IDs, and red-line match stamps. The red-line list on the landing page sets the same face at 0.8125rem.

### Named Rules

**The Three-Voice Rule.** Each face has a job the others cannot do: Archivo and Archivo Narrow are the panel's regulatory voice (headings, labels, rules, body); Tinos is the source document's voice and appears *only* on verbatim quoted contract text; DotGothic16 is the overprint and appears only on codes and red-line stamps. Never mix a role's face into another role's run — a quote set in the grotesque stops looking quoted, and a heading in Times stops looking like the panel talking.

**The Title Over Barline Rule.** In the Drug Facts lockup the heavy 7px barline sits *beneath* its title, never above it. Built the other way round first and it read as the claim's underline rather than the panel's rule.

**The Paired Step Rule.** Every heading and quote role is a pair, not a fluid clamp: a base size and one step at ≥640px (`display` 1.875→2.25rem, `display-close` 1.875→2.375rem, `headline` 1.625→2rem, `quote-critical` 1.75→2.75rem, `quote-serious` 1.125→1.375rem, `quote-noted` 1→1.0625rem). A size that is not one of those ten values is not in the ramp.

**The Numeral Rule.** Counts, lot codes, and any figure that changes in place use tabular numerals.

## Layout

A single centred column capped at `{spacing.container}` (86rem), with 1rem gutters rising to 1.75rem at ≥640px. Sections stack with 4rem bottom padding, 6rem at ≥640px; the page opens at 1.25rem top padding because there is no nav bar to clear.

The signature layout is a 12-column grid at ≥1024px: the facts panel takes 7 columns, the source document takes 5 and sticks to the viewport at `top: 1.25rem` so a citation is always visible beside its warning. Below 1024px the grid collapses to one column and the source document stacks under the analysis — which is why selecting a warning at that width first scrolls the document panel into view before scrolling to the mark inside it. The document's own scroll container is capped at 30rem (40rem at ≥1024px) so the panel never outgrows the screen.

Inside panels, rhythm is small and regular: 1.25rem horizontal padding rising to 1.75–2rem at ≥640px, 0.5–0.75rem between a heading and its paragraph, 1.25rem between finding blocks, 1.5rem between grid cards. Explanation grids are two columns at ≥640px with a 2.5rem column gap; the severity explainer uses a fixed 13rem first column so the three tier names align down the page. Measure is constrained everywhere — no running text block exceeds 68ch.

### Named Rules

**The No Chrome Rule.** The page has no navigation bar and no hero above the panel. The first thing in the viewport is the panel itself, already filled in.

## Elevation & Depth

Nothing lifts. There are no shadows in this system at all, and adding one would break the premise that everything on the page was printed in a single pass. Depth comes from three flat devices instead: ground versus stock (carton green behind, panel white in front), rule weight (6px / 3px / 1px borders in ink or warning red), and tonal fills on the two interaction states. The only motion-adjacent depth cue is the entrance's brief blur, which reads as ink settling onto stock rather than as an object moving toward the reader.

### Named Rules

**The Printed Flat Rule.** No box-shadow, no gradient, no blur at rest, no translucency. A surface is separated from its neighbour by a rule or by a change of stock, never by lift.

**The Entrance Never Hides Text Rule.** The authored entrance animates transform and filter only — `print-set` moves 7px and clears a 2.5px blur, `print-bar` sweeps rules from `scaleX(0)` left to right, `print-stamp` lands the lot code last at 760ms. Nothing animates opacity except the stamp, so every word is readable whether or not the animation runs. Finding blocks stagger heaviest-first from 280ms in 90ms steps. All three are disabled entirely under `prefers-reduced-motion`, along with smooth scrolling.

## Shapes

Zero radius, enforced globally (`* { border-radius: 0 }`). Every corner in this world is square: panels, buttons, boxed warnings, bullets, the scrollbar thumb.

The form vocabulary is rules and boxes. A panel is a 3px ink box on white stock. A barline is a 7px bottom rule under a section title, with a 3px variant for secondary divisions and a 1px hairline for row separation. Bullets are solid squares — 0.5rem in Overprint Blue for the red-line list, 0.625rem in Ink for the limits list — never glyphs, discs, or icons. Browser surfaces are part of the form language: a 13px square scrollbar with a Carton Deep track and a Carton Ink Soft thumb inset by a 4px border, a Warning Red selection highlight on Panel White, and a 2px Warning Red focus ring at 3px offset.

### Named Rules

**The Uniform Box Rule.** A boxed warning is a box: uniform rule weight on all four sides. The Critical weight was briefly built as a 10px left border and reverted — a thick coloured side bar is a callout costume from another design language, and it is banned here at any weight or colour.

## Components

### Buttons

Printed rectangles with a 3px border and letterspaced uppercase label type. There is exactly one action on the page and the button never competes with the panel around it.

- **Shape:** Square (0 radius), 3px solid border.
- **Primary (in-panel):** Carton Green fill, Carton Ink text, 3px Ink border, 0.75rem × 1.5rem padding, label type at 800 weight with 0.08em tracking.
- **Hover / Focus:** Fills to Ink with Panel White text (`transition-colors`). Focus shows the global 2px Warning Red ring at 3px offset.
- **On-carton variant:** Used only where a button sits directly on the green ground (the closing call to action): Carton Ink fill, Carton Deep text, 3px Carton Ink border, 0.875rem × 1.75rem padding; inverts to Carton Deep fill on hover.
- The sign-up page's button is the primary variant, unchanged. It is not a separate component.

### Cards / Containers

- **Corner Style:** Square, 0 radius.
- **Background:** Panel White on the carton ground.
- **Shadow Strategy:** None; see Elevation & Depth.
- **Border:** 3px solid Ink on all sides. The one exception is the citation-guarantee band, which is set directly on the carton with 3px Carton Ink Soft rules top and bottom only — an opened panel rather than a closed one.
- **Internal Padding:** 1.25rem × 1.5rem, rising to 2rem at ≥640px. Masthead and section rows inside a panel are separated by hairlines rather than gaps.

### Contract Facts panel (signature component)

The instrument the page is built around: an analysis panel and the source document, wired together so no finding is ever shown without its sentence.

- **Masthead:** Wordmark left, descriptor in narrow label type right, over a hairline. Beneath it the panel's claim in Display type, the framing paragraph, then the section title "Contract Facts" in Headline type with the overprinted lot code on the same baseline and the 7px barline beneath both.
- **Findings, ordered heaviest first:** Critical (6px Warning Red box on all sides), Serious (3px Ink top rule), Worth noting (1px Ink hairline top rule), and — sorted last — a tierless red-line match (2px dashed Overprint Blue top rule). Each block is a full-width button: tier label, section reference, the verbatim quote in Tinos at the tier's own size, the rationale in Body small, and an overprint stamp line if the clause matched a red line.
- **States:** Hover fills Panel Hover; the active citation fills Panel Selected. Both are the only fills a finding ever takes; a finding's rule weight never changes on interaction.
- **Source document:** Its own 3px panel, sticky at ≥1024px, capped-height scroll container, clause headings in narrow tight label type, body in Source type. Cited sentences are buttons: Critical is a 3px Warning Red underline over the Critical Mark wash, Serious a 3px Ink underline, Worth noting a 1px Ink underline, at a 3px underline offset. A red-line match adds a dashed Overprint Blue underline at a 7px offset on an inner span, so both marks draw and each stops exactly at its own text. The selected mark takes a 2px outline at 2px offset in its own signal's colour.
- **Linking:** Selecting a finding scrolls the matching mark to the vertical centre of the document panel; below 1024px it first brings the document panel into view. Selecting a mark selects its finding. Scroll behaviour follows `prefers-reduced-motion`.

### Severity explainer rows

Three rows, each led by a bare rule that *is* the tier's device at full width: a 3px Warning Red bar, a 3px Ink bar, a 1px Ink hairline. The tier name sits in a fixed 13rem column with its one-line test beneath in narrow label type, and the explanation in Body small beside it. This is the legend for the panel above, drawn in the same ink.

## Do's and Don'ts

### Do:
- **Do** rank severity by rule weight: 6px box (Critical), 3px top rule (Serious), 1px hairline (Worth noting), all in Ink except Critical.
- **Do** spend Warning Red only on Critical, in both panels, and keep every other citation mark at ink weight.
- **Do** draw a red-line match as an overprint — dashed Overprint Blue, on an inner span, independent of any tier rule — so a clause carrying both signals shows both.
- **Do** mark a citation with `text-decoration` so the rule stops exactly where the sentence stops, including on its last wrapped line.
- **Do** set every verbatim quoted clause in Tinos, and nothing else in Tinos.
- **Do** put the 7px barline beneath its title.
- **Do** animate transform and filter on entrance, never opacity on text, and disable the entrance under `prefers-reduced-motion`.
- **Do** keep every corner square and every surface flat.

### Don't:
- **Don't** introduce a second or third tier colour, a coloured badge, or a numeric risk score. Three named tiers, ranked by rule weight, is the whole model.
- **Don't** build a boxed warning as a thick coloured left border. A box rule is uniform on four sides; a coloured side bar is a banned callout costume.
- **Don't** mark a cited sentence with `border-top` (it paints once on an inline element and lands above the preceding line) or with a painted background (it sizes to the inline box and overruns the sentence on the last wrapped line). Both were built and both were wrong.
- **Don't** let a red-line match change, borrow, or imply a severity tier, and don't give a tierless match a severity rule.
- **Don't** set a heading in Tinos or a quote in Archivo, and don't use DotGothic16 for anything but overprint codes and red-line stamps.
- **Don't** add a shadow, a gradient, a corner radius, or a hero headline above the panel.
- **Don't** show a warning without its source sentence reachable and visible in the document panel.
- **Don't** reintroduce the retired "Card & Review" world — referee cards, broadcast VAR graphic, Teko/Inter/JetBrains Mono, pitch-green turf edge, or the Red Card / Yellow Card / Noted / Play On naming. It is gone from the code and is not a fallback.
