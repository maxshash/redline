---
version: 1
slug: "app-shell"
primary_target: "app-shell"
related_targets: []
---

# Surface: App shell (signed in)

Scope: the frame behind sign-in that holds every logged-in screen. Visitor mode: **Operate**.

Not built today — brief only, per explicit instruction. No screens implemented; this captures scope, constraints, and the inherited world so a future build starts aligned rather than re-litigating them.

Audience: the same freelancer/founder from PRODUCT.md, now signed in and returning — someone with a real document open, doing the task (checking flags, drafting a counter-offer, asking a question, checking a red line) rather than being persuaded of anything.

Task: hold five sub-experiences in one frame — paste or upload a document, the result (summary, ranked flags, clean verdict), the question box, the reader's red-line list, and the library of past uploads. The shell is navigation and layout scaffolding around these; it is not any one of them.

Important states: empty (no documents yet), a document mid-analysis (loading/streaming), a clean result with zero Critical or Serious flags — which must read as a trustworthy finding, not as a failure or an empty state (ADR 0006) — a flagged result, and the library holding several saved documents.

Frequency: a freelancer or founder reviewing agreements as they arrive, not a daily-use dashboard. The shell should re-orient someone returning after weeks away rather than assume continuity.

Constraints:
- Scanability and task completion outrank expression in Operate mode; the world lives in precise details (rule weights, overprint codes, tabular figures), never at the expense of finding the flag, the citation, or the action.
- Every result view keeps the source-sentence citation visible. A flag with no visible source is a bug (ADR 0001), so the layout may never truncate a citation or hide it behind a disclosure by default.
- Red-line matches and severity tiers are two independent signals and must stay visually distinct (ADR 0007). In this world that separation is already structural: severity is rule weight, a red-line match is an overprint. Never merge them into one badge, and never give a red-line match a severity rule.
- Documents and analyses are private per user — no sharing, collaboration, or multi-user affordances anywhere in the shell.
- No payments/billing UI. No OCR or scan/photo upload affordance; the upload surface accepts only what the browser can extract text from.
- Counter-offers appear only on flags that already carry a valid citation — the shell must not have a place to render one without its source.

## Inherited world

Inherits The Facts Panel, locked for the landing page in round 4 (seed key f053c731; see `.impeccable/surfaces/landing.md` and DESIGN.md): pharmacy-carton ground, box-ruled printed-white panels, severity as rule weight with color rationed to Critical alone, red-line matches as off-register dot-matrix overprint, and the three-voice split — Archivo and Archivo Narrow for the panel's own regulatory voice, Tinos for verbatim quoted source text, DotGothic16 for overprint codes and document IDs.

The translation into Operate mode is the real design work and is not decided here. What the world already hands this surface, and what should survive translation: the panel is the primary container, so screens are ruled fields rather than floating cards; a quoted sentence is always set in the source document's own voice, so it never looks like Redline talking; and the severity hierarchy needs no legend, because a heavier rule already reads as more serious.

One thing the landing page does not answer and this surface must: the Drug Facts panel is a fixed-length printed object, and the app holds documents of any length with any number of flags. How the panel's density and rule system survive a sixty-flag document, and how the library shows many panels at once, are open.

## Unresolved decisions

- Composition and structure of each of the five sub-experiences (not decided — this is a scope brief, not a layout).
- Navigation model between upload, result, question box, red lines, and library. The world suggests a carton/panel logic rather than a conventional left rail, but nothing is chosen.
- How the clean result is rendered so it reads as a trustworthy finding rather than "nothing happened." The landing page's answer — state it plainly in the panel's own voice, with no color and no badge — is a starting point, not a decision for this surface.
- How the panel system scales to long documents and to the library's many-documents view (see above).
- Whether the question box, which must answer only from the document, gets a visual device that distinguishes its answers from analysis output. The two have different guarantees and should probably not look identical.
