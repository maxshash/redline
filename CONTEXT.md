# Redline

Analyzes uploaded contracts, leases, freelance agreements, and ToS documents, flagging risk with a citation back to the exact source sentence.

## Language

**Dangerous clause**:
A clause that shifts risk, cost, or control from a "default"/neutral allocation onto the user — it makes the other party's failure the user's problem, or takes away the user's ability to walk away. This is the bar a clause must clear to be flagged at all.
_Avoid_: Risky clause, red flag (as a general term — "red line" is reserved for the user's own editable list), unusual clause.

**Unusual clause**:
A clause that deviates from a boilerplate norm, in either direction. Not every unusual clause is dangerous — a clause that's unusual purely in the user's favor is not flagged. Redline does not surface "unusually good" clauses.
_Avoid_: Non-standard clause.

**Severity**:
A dangerous clause's placement into one of three tiers, driven primarily by how easy the clause is to miss and how hard its consequence is to undo once triggered — not by raw financial exposure alone. A clause with catastrophic-but-rare exposure can rank below a clause that is merely certain-but-annoying under this model; that ordering is deliberate, not a bug.
_Avoid_: Risk score, priority (numeric scoring is rejected in favor of named tiers — see ADR-0003).

**Severity tiers**:
- **Critical**: Easy to miss (buried, boilerplate-sounding) *and* hard or costly to undo once triggered. The auto-renewal archetype.
- **Serious**: Easy to miss *or* hard to undo, not both.
- **Worth noting**: Meets the "dangerous clause" bar but is neither particularly easy to miss nor irreversible.
_Avoid_: High/medium/low, numeric levels.

**Red line**:
An entry in the user's own editable list of concerns that drives the analysis — distinct from a "dangerous clause," which is Redline's own default judgment independent of what the user has told it to look for.
_Avoid_: Flag (reserve "flag" for the output of analysis, not the user's input list).

**Red-line match**:
A clause reported because it matches an entry in the user's red-line list, shown as a signal independent of the clause's severity tier. A red-line match is reported regardless of whether the clause clears the "dangerous clause" bar on its own; it does not force or imply any particular severity tier.
_Avoid_: Red flag, critical match (a red-line match and a Critical severity tier are different things and can occur independently of each other).
