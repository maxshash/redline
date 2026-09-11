# 04: Counter-offer drafting per flag

**What to build:** every flag produced by `analyzeDocument` now carries a drafted counter-offer, gated so a flag without a valid citation can never reach counter-offer generation.

**Blocked by:** 03 (analyzeDocument seam: summary + severity-tiered flags with citations)

**Status:** ready-for-agent

- [ ] Every flag with a valid citation carries a drafted counter-offer proposing concrete alternative language.
- [ ] There is no code path that drafts a counter-offer for an uncited flag — enforced at the type/code level, not just by convention.
- [ ] Counter-offer text is displayed alongside its flag in the UI.
- [ ] Test: a flag lacking a citation cannot produce a counter-offer (this state is unrepresentable, not just untested).
