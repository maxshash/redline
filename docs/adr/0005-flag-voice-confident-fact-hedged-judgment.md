# 5. A flag states the clause confidently and hedges only the severity judgment

## Decision

Every flag has two parts, written in two different voices. The clause's existence and content is stated as plain fact, with no hedging — it's a direct quote, per ADR-0001, so there's nothing to be uncertain about. The severity/interpretation half of the flag ("worth pushing back on" vs. "may be worth reviewing with a professional") is hedged in proportion to how borderline the severity tier is.

## Why

Hedging the quote itself is pointless — the text is either in the document or it isn't. Hedging is only meaningful where the model is actually making a judgment call, which is the severity assessment, not the citation. Splitting voice this way also lets hedging scale with the tier system (ADR-0003) instead of being all-or-nothing across every flag.

## Consequences

- Prompt design must keep these two clauses of a flag structurally distinct so the model doesn't blend confidence levels between "what the document says" and "how bad this is."
