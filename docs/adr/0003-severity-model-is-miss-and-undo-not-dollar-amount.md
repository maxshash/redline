# 3. Severity is driven by "easy to miss, hard to undo," not by dollar exposure

## Decision

A clause is flagged at all only if it shifts risk, cost, or control onto the user (see [[Dangerous clause]] in CONTEXT.md). Among flagged clauses, severity is assigned to one of three named tiers — Critical, Serious, Worth noting (see CONTEXT.md) — based primarily on how easy the clause is to miss and how hard its consequence is to undo, not on the size of the financial exposure. Severity is never a numeric score.

## Alternatives considered

- **Rank by financial exposure** (uncapped liability, no cap on indemnification) regardless of likelihood. Rejected: this is the clause category the research found zero named victims for, despite dedicated search effort — building the severity model's primary axis around the least-evidenced pattern was judged a bad first bet.
- **Flag any deviation from a boilerplate norm**, sorting signal from noise via severity alone. Rejected: it surfaces clauses that are merely unusual, including ones unusual in the user's favor, which the "dangerous clause" bar exists specifically to exclude.
- **Numeric severity score (e.g. 1–10)**. Rejected: implies a precision the model isn't actually capable of — nobody, including the model, can justify "why a 7 and not a 6." Named tiers force a plain-English justification instead, matching the "state only what the document supports" discipline from ADR-0001.

## Consequences

- A clause with catastrophic-but-rare exposure (e.g. uncapped indemnification) can rank *below* a clause that is merely certain-but-annoying (e.g. a 60-day auto-renewal window). This ordering is deliberate: it optimizes for the pattern the research corroborated across multiple independent angles — a normal reader having no practical way to catch the clause before it costs them — over theoretical worst-case exposure.
- Unusual-but-neutral and unusual-but-favorable clauses are never surfaced, even as a positive note. Redline is silent about good news by design.
- Every flag needs a stated reason for its tier placement (which axis: hard to miss, hard to undo, or both) — this is a natural extension of the source-citation requirement in ADR-0001, and should be testable the same way.
