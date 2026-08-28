# 1. Every flag cites its source

## Decision

Every risk flag Redline produces must include the exact sentence from the uploaded document that it came from. If a flag's source sentence cannot be shown, that is a bug, not a formatting preference — the flag does not ship.

## Alternatives

- Let the model describe the risk in its own words, with no quote attached.
- Quote a paraphrase or a nearby passage when the exact sentence is awkward to isolate.
- Show the source only on request (e.g. behind a "why?" click), not by default.

## Why

A reader doesn't have to trust Redline's judgment — they can open the document, find the quoted sentence, and check for themselves that it says what the flag claims. If the sentence isn't there, the flag is wrong, verifiably, not just unconvincing. This turns "trust the analysis" into "check the analysis," which is the only way a stranger's summary of your contract earns belief.

## Consequences

- The model can't flag a risk it can't pin to a specific sentence — vibes-based or inferred risks ("this contract feels one-sided") are unrepresentable and must be dropped.
- Parsing must preserve a clean mapping from extracted text back to individual source sentences; anything that mangles sentence boundaries (bad OCR, sloppy text extraction) breaks citations, which is part of why OCR is out of scope for this version.
- Every flag needs a test path that checks the cited sentence actually appears verbatim in the source text, not just that a citation field is non-empty.
- Counter-offer drafting is constrained to clauses that already have a valid citation — there's no such thing as a counter-offer for an unsourced flag.
