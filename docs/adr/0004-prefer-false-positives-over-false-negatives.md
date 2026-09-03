# 4. Redline prefers false positives over false negatives

## Decision

When tuning what counts as a [[Dangerous clause]], Redline is built to over-flag rather than under-flag. A flag on a harmless clause is an accepted cost; a missed dangerous clause is not.

## Why

A false positive is visible and self-correcting: the user reads the flag, checks the cited sentence (ADR-0001), and dismisses it in seconds. A false negative is invisible by construction — the user has no way to know a clause was skipped, so nothing downstream can catch it. Given the citation requirement already caps the cost of over-flagging, the asymmetry favors flagging more, not less.

## Consequences

- This makes the "clean document" behavior (ADR-0006) load-bearing: if over-flagging is accepted, the severity tiers are the only thing standing between this stance and the tool crying wolf on every document.
- Prompt/eval work that tunes flag recall should treat a missed dangerous clause as a more serious defect than an unnecessary flag.
