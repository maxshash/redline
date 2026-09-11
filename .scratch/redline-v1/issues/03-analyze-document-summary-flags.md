# 03: analyzeDocument seam: summary + severity-tiered flags with citations

**What to build:** uploading a document produces a plain-English summary and a list of flags against the default freelance/consulting clause library, each with a severity tier, a rationale for that tier, and a verbatim source-sentence citation.

**Blocked by:** 02 (Upload, client-side extraction, and private document storage)

**Status:** ready-for-agent

- [ ] `analyzeDocument(text, redLines) → Analysis` seam implemented, routed through OpenRouter, exercised only via input-text-in/structured-output-out — no test asserts on prompt wording.
- [ ] Output includes a plain-English summary of the document.
- [ ] Output includes flags against the default clause library (Critical: auto-renewal/short-notice-only cancellation, unilateral no-notice termination-for-convenience; Serious: broad/exclusive IP assignment, uncapped indemnification, non-compete/non-solicit; Worth noting: arbitration/class-action waiver, fee/price escalators and liability caps).
- [ ] Every flag carries a severity tier, a short rationale naming which axis drove it (hard to miss / hard to undo / both), and the verbatim clause text it's citing.
- [ ] Citation-integrity test: for every flag in any test run, the cited clause text is an exact substring of the input document text — zero tolerance.
- [ ] Clean-document test: a labeled corpus of issue-free freelance agreements produces zero Critical/Serious flags for most of them.
- [ ] Recall test: a labeled corpus with planted Critical/Serious patterns flags the large majority of them.
- [ ] Flag voice test: clause-text portion is an exact quote; severity/rationale portion asserts nothing the quote doesn't support.
- [ ] A flag with no citable clause text is unrepresentable in the data model — there is no "flag without a quote" state.
