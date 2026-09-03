# 6. A document with no Critical or Serious flags is a valid, designed-for output

## Decision

Redline does not guarantee at least one flag per document. A summary that reports no Critical or Serious clauses — possibly only "Worth noting" items, possibly nothing at all — is an expected, correctly-functioning result, not an edge case to avoid.

## Why

This is the direct counterweight to ADR-0004's preference for false positives: if over-flagging is the accepted error mode, the severity tiers only stay meaningful if "nothing Critical" is real and reachable. A tool that always finds something turns its severity tiers into noise, which is the exact failure this product's citation-first design (ADR-0001) is meant to avoid — most documents most freelancers upload will, honestly, be standard.

## Consequences

- Product copy and UI for a no-flags result needs to read as a positive, credible outcome ("this looks standard") rather than as a failure state or an apology.
- Eval/test suites need documents that are expected to produce zero Critical/Serious flags, not just documents that are expected to produce flags.
