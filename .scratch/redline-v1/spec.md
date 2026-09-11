Status: ready-for-agent

# Redline v1

## Problem Statement

Freelancers and early-stage founders sign contracts — freelance/consulting agreements, and the leases, ToS, and other contracts they encounter — without a practical way to catch the clause that later costs them money or leverage. Reviewing with a lawyer costs $650–$870 on average, which this segment is documented resisting even when they know it's probably worth it ("$700 is a lot of money"). So most of the time they either don't review at all, or review and still miss the clause that matters, because it's written to be missed.

## Solution

Redline lets a user upload a document, extracts the text in their browser (never storing the original file), and returns: a plain-English summary; clauses that shift risk, cost, or control onto the user, each ranked into a severity tier and shown with the exact source sentence it came from; a drafted counter-offer for each flagged clause; a question box that answers only from the document; an editable list of the user's own red lines that surfaces independently of Redline's own judgment; and a saved library of past uploads. v1 is tuned specifically around freelance/consulting agreements — the served segment is freelancers and early-stage founders, not renters or job-offer reviewers (see [ADR 0002](../../docs/adr/0002-freelance-founders-are-v1s-served-segment.md)).

## User Stories

1. As a freelancer, I want to upload a freelance/consulting agreement, so that I can see what's in it without paying for a lawyer review.
2. As a freelancer, I want the document text extracted in my browser, so that only the extracted text — never the original file — ever leaves my device.
3. As a freelancer, I want a plain-English summary of the document, so that I understand what I'm agreeing to without wading through legal language.
4. As a freelancer, I want clauses that shift risk, cost, or control onto me flagged, so that I know which parts of the document deserve my attention before I sign.
5. As a freelancer, I want every flagged clause to show the exact source sentence it came from, so that I can check the flag against my own document instead of trusting Redline's judgment blindly.
6. As a freelancer, I want each flag ranked into a severity tier (Critical, Serious, or Worth noting), so that I know which flags to act on first.
7. As a freelancer, I want the severity tier to be based on how easy the clause is to miss and how hard its consequence would be to undo, so that ranking reflects real-world risk rather than theoretical dollar exposure alone.
8. As a freelancer, I want a drafted counter-offer for every flagged clause, so that I have concrete language to propose instead of starting from a blank page.
9. As a freelancer, I want counter-offers drafted only for clauses that already have a valid citation, so that Redline never proposes a change to something it can't point to in my document.
10. As a freelancer, I want a document with no Critical or Serious clauses to be reported plainly as such, so that I trust a "looks standard" result as much as one full of flags.
11. As a founder, I want to define my own list of red lines, so that the analysis reflects what I personally care about, not only Redline's defaults.
12. As a founder, I want to edit my red-line list at any time, so that it can evolve as I learn what matters to me.
13. As a founder, I want a red-line match reported whenever a clause matches something on my list, regardless of whether Redline's own severity model would independently flag it, so my own stated concerns are never silently filtered out.
14. As a founder, I want a red-line match shown as a signal separate from a clause's severity tier, so I can tell "you asked about this" apart from "Redline judged this dangerous."
15. As a freelancer, I want a question box where I can ask about the uploaded document, so that I can get quick clarifications without re-reading the whole thing.
16. As a freelancer, I want answers in the question box to come only from the document's own text, so I'm never given information the document doesn't actually support.
17. As a freelancer, I want a flag to state the clause's content as plain fact and hedge only the severity judgment, so I can tell what's certain (the quote) from what's the model's judgment (the risk assessment).
18. As a freelancer, I want a library of my past uploaded documents and their analyses, so that I can revisit a contract I reviewed previously without re-uploading it.
19. As a founder, I want documents I upload to stay private to me, so that no one else can see contracts I've reviewed.
20. As a freelancer, I want confidence that Redline never invents a risk it can't point to a specific sentence for, so every flag is checkable against my own document.
21. As a founder, I want Redline to flag a clause even when it isn't fully certain, rather than staying silent, so I don't miss something that could hurt me just because the model wasn't sure.
22. As a freelancer, I want the tool to never claim something the document doesn't say, so I'm not misled by confident-sounding language that outruns the evidence.

## Implementation Decisions

- Two seams carry the product's real logic; everything else is CRUD/plumbing around them.
  - **`analyzeDocument(text, redLines) → Analysis`**: takes extracted document text and the user's current red-line list, returns a plain-English summary, a list of flags, and a list of red-line matches.
  - **`answerQuestion(text, question) → Answer`**: takes extracted document text and a user question, returns an answer grounded only in that text. Has no access to the red-line list or the analysis output, and must not draw on outside/world knowledge.
- **Flag shape**: each flag carries the verbatim clause text it's citing, a severity tier, a short rationale for that tier (which axis — hard to miss, hard to undo, or both — drove it), and a counter-offer. A flag with no citable clause text is unrepresentable — there is no "flag without a quote" state in this model.
- **Severity tier assignment**: a clause is only eligible to be flagged if it shifts risk, cost, or control from a neutral default onto the user (the [[Dangerous clause]] bar in CONTEXT.md). Tier placement — Critical / Serious / Worth noting — is driven by how easy the clause is to miss and how hard its consequence is to undo, not by dollar exposure. No numeric score exists anywhere in this model. See [ADR 0003](../../docs/adr/0003-severity-model-is-miss-and-undo-not-dollar-amount.md).
- **Flag voice**: the clause-text portion of a flag is always stated as fact (it's a direct quote). The severity/interpretation portion is hedged in proportion to how borderline the tier assignment is. These are two structurally distinct pieces of a flag, not one blended voice. See [ADR 0005](../../docs/adr/0005-flag-voice-confident-fact-hedged-judgment.md).
- **Error-mode tuning**: when a clause is ambiguous against the dangerous-clause bar, the system favors flagging (false positive) over staying silent (false negative). See [ADR 0004](../../docs/adr/0004-prefer-false-positives-over-false-negatives.md).
- **Zero-flag output**: a document producing no Critical or Serious flags is a valid, first-class `analyzeDocument` result — there is no fallback behavior that forces at least one flag per document. See [ADR 0006](../../docs/adr/0006-clean-document-is-a-valid-output.md).
- **Red-line matching**: matching document text against a red-line list entry happens independently of the dangerous-clause filter — a match is reported with its own citation whether or not that clause would independently clear the severity bar. A red-line match and a severity tier are two separate fields on the analysis output, never merged into one. See [ADR 0007](../../docs/adr/0007-user-red-lines-bypass-the-dangerous-clause-filter.md).
- **Counter-offer gating**: counter-offer generation is only reachable for flags that already carry a valid citation. There is no code path that drafts a counter-offer for an uncited flag. See [ADR 0001](../../docs/adr/0001-every-flag-cites-its-source.md).
- **Default clause library** (v1, tuned for freelance/consulting agreements — see [ADR 0002](../../docs/adr/0002-freelance-founders-are-v1s-served-segment.md)):
  - Critical: auto-renewal / short-notice-only cancellation windows; unilateral no-notice termination-for-convenience.
  - Serious: broad/exclusive IP assignment; uncapped indemnification/liability-shifting; non-compete/non-solicit restricting future client relationships.
  - Worth noting: arbitration clauses/class-action waivers; fee/price escalators and liability caps.
  - (Full rationale per pattern is in PRD.md's "My red lines" section — this list is the implementation-facing summary of it.)
- **Text extraction and storage**: extraction happens client-side (browser); only the extracted text, never the original uploaded file, is persisted. No OCR pipeline exists or is planned for this version — scanned/image-only documents are unsupported.
- **Model calls**: both seams route through OpenRouter, per the settled stack. Persistence (documents, analyses, red-line lists, library) and auth go through Supabase.
- Documents and their analyses are private to the uploading user; no cross-user access exists.

## Testing Decisions

- Tests exercise the two seams' external behavior only — input text (and red lines, or a question) in, structured output out. No test should assert on prompt wording or internal model call structure.
- No prior test suite or code exists yet in this repo — this is the first test suite; there's no existing pattern to follow.
- **Citation integrity (highest-priority test, `analyzeDocument`)**: for every flag returned across any test run, assert the flag's clause text is a verbatim substring of the input document text. Mechanical, deterministic, zero tolerance — a single failure is a shipped bug, not a quality nit. Directly implements PRD.md's "every cited sentence is verbatim" bar.
- **Recall on known-dangerous patterns (`analyzeDocument`)**: run against a labeled corpus of freelance/consulting agreements with planted instances of each Critical/Serious pattern (auto-renewal, unilateral termination, broad IP assignment, uncapped indemnification, restrictive non-compete/non-solicit). Assert the large majority of planted instances are flagged. A missed instance is weighted as a worse failure than an extra, unnecessary flag.
- **Clean-document behavior (`analyzeDocument`)**: run against a labeled corpus of freelance/consulting agreements a human reviewer has confirmed contain no Critical/Serious issues. Assert zero Critical/Serious flags for most of them. Treat a rising failure rate on this set as the earliest signal that severity tiering has collapsed into "always worried," which would make the tiers meaningless.
- **Red-line match completeness (`analyzeDocument`)**: run against documents paired with red-line lists where specific matching text is known to exist. Assert every known match is reported, independent of what severity tier (if any) that clause separately receives.
- **Flag voice discipline (`analyzeDocument`)**: assert that the clause-text portion of every flag is an exact quote, and that the severity/rationale portion does not assert anything the quoted text doesn't support — a flag whose interpretation goes beyond the quote is a defect, not a style issue.
- **Grounded answering (`answerQuestion`)**: run with questions whose answers are and aren't supported by a given document's text. Assert supported questions draw only on the given text, and assert unsupported questions produce a response that doesn't assert unsupported claims — never a fabricated answer standing in for "I don't know."

## Out of Scope

- Payments/billing, in any form.
- OCR or any handling of scanned/image-based documents — client-side text extraction only.
- Sharing uploaded documents or analyses between users.
- Tuned clause libraries or severity defaults for leases, ToS, or SaaS/vendor contracts — those document types are accepted at upload but analyzed against the freelance-agreement-tuned defaults in this version, not a defaults set of their own.
- Surfacing clauses that are unusual purely in the user's favor — the dangerous-clause bar only ever flags clauses that shift risk, cost, or control onto the user.
- Numeric severity scoring of any kind.
- Any pricing or monetization logic.

## Further Notes

This spec covers everything in PRD.md's "What the first version does" as a single feature, since no application code exists yet in this repo and the pieces (upload, analysis, Q&A, red lines, library) form one cohesive user journey rather than independently shippable slices.

The served segment is freelancers and early-stage founders reviewing freelance/consulting agreements. Renters and job-offer reviewers are explicitly and deliberately not served by this version (ADR 0002) — that gap should not get "fixed" mid-implementation as if it were an oversight.

PRD.md's "What good looks like" section is the source of truth for eval/test thresholds; the Testing Decisions above restate it in seam-testable terms. If they ever diverge, PRD.md wins.

The red-line list and the severity model are two independent signals throughout the system — resist merging them into a single "importance" field anywhere in implementation.
