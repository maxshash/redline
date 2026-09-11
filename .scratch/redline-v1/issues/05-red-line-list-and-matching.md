# 05: Editable red-line list + red-line match reporting

**What to build:** a user can create and edit their own red-line list; `analyzeDocument` matches document text against it independently of the severity model, and matches are reported as a separate signal on the analysis, each with its own citation.

**Blocked by:** 03 (analyzeDocument seam: summary + severity-tiered flags with citations)

**Status:** ready-for-agent

- [ ] A user can add, edit, and remove entries in their own red-line list.
- [ ] `analyzeDocument` accepts the user's current red-line list and returns red-line matches as a field distinct from severity flags — never merged into one "importance" field.
- [ ] A red-line match is reported whenever a clause matches a red-line entry, regardless of whether that clause independently clears the dangerous-clause bar or what severity tier (if any) it separately receives.
- [ ] Each red-line match carries its own citation (verbatim source sentence).
- [ ] Red-line match completeness test: against documents paired with red-line lists where matching text is known to exist, every known match is reported.
- [ ] UI shows red-line matches as a distinct signal from severity tiers (e.g. "you asked about this" vs. "Redline judged this dangerous").
