# 7. A user's red line reports a match independently of Redline's own severity judgment

## Decision

When a clause matches an entry in the user's own [[Red line]] list, Redline reports the match and cites the clause regardless of whether that clause would independently clear the [[Dangerous clause]] bar (ADR-0003). The match is a separate signal from Redline's own severity tier, shown alongside it rather than merged into it — a red-line match doesn't force a clause into "Critical," and a clause the user didn't ask about but Redline judges dangerous still gets its own independent tier.

## Why

"An editable list of the user's own red lines, which drives the analysis" (CLAUDE.md) is a direct instruction — if the user asks to be told about any mention of a clause type, silently downgrading or suppressing that per Redline's own judgment contradicts the point of giving them an editable list at all. But collapsing the match into Redline's own severity tier would misrepresent Redline's independent judgment (e.g. reporting a narrow, favorable non-compete as "Critical" just because the user flagged non-competes generally, when Redline's own model says otherwise).

## Consequences

- The flag data model needs two independent fields per clause: Redline's own severity tier, and whether/which user red line(s) it matched — not one merged status.
- UI needs to represent "your red line matched here" as distinct from "Redline judged this dangerous," since a clause can have either, both, or neither.
