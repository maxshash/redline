---
version: 1
slug: "app-shell"
primary_target: "app-shell"
related_targets: []
---

# Surface: App shell (signed in)

Scope: the frame behind sign-in that holds every logged-in screen. Visitor mode: **Operate**.

Not built today — brief only, per explicit instruction. No screens implemented; this captures scope and constraints so a future build starts aligned rather than re-litigating them.

Audience: the same freelancer/founder from PRODUCT.md, now signed in and returning — someone with a real document open, doing the task (checking flags, drafting a counter-offer, asking a question, checking a red line) rather than being persuaded of anything.

Task: hold five sub-experiences in one frame — paste/upload a document, the result (summary, ranked flags, clean verdict), the question box, the reader's red-line list, and the library of past uploads. The shell is navigation and layout scaffolding around these; it is not any one of them.

Important states: empty state (no documents yet), a document mid-analysis (loading/streaming), a clean-verdict result (zero Critical/Serious — must read as trustworthy, not as a failure or empty state; see ADR 0006), a flagged result, and the library with multiple saved documents.

Frequency: a freelancer/founder reviewing agreements as they come in — not a daily-use dashboard, so the shell should orient a returning-after-a-gap user quickly rather than assume continuity.

Constraints:
- Scanability and task completion outrank expression in Operate mode; brand lives in precise details (stamps, tabular digits, ruled dividers), never at the expense of finding the flag, the citation, or the action.
- Every flag/result view must keep the source-sentence citation visible — a flag with no visible source is a bug (ADR 0001), so the shell's layout must never truncate or hide citations behind an extra click by default.
- Red-line matches and severity tiers are two independent signals and must read as visually distinct in the shell's vocabulary, never merged into one badge (ADR 0007).
- Documents/analyses are private per user — no shared-state or multi-user affordances anywhere in the shell.
- No payments/billing UI, no OCR/scan upload affordance.

## Inherited world

Inherits the Claim Chart direction locked for the landing page (seed key 3b76eac0; see `.impeccable/surfaces/landing.md` and, once written, DESIGN.md): onion-skin ground, typewriter ink, rationed verdict-red for Critical only, quieter ochre for Serious, tabular mono digits for counts, verdict stamps, quiet spectrum banding (color never floods a full row). Translating this into Operate mode — precise, scanable, low-drama — is a decision for whoever builds this surface, not decided here.

## Unresolved decisions

- Exact composition/structure of each of the five sub-experiences within the shell (not decided — this is a scope brief, not a layout).
- Navigation model between upload/result/question-box/red-lines/library (left rail vs. tabs vs. something native to the inherited world) — open until build time.
- How the clean-verdict state is rendered so it reads as "trustworthy result," not "nothing happened" — open until build time.
