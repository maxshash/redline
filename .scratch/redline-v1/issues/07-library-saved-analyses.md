# 07: Library: past documents with saved analyses

**What to build:** a user revisits their document library and reopens any past document to see its full saved analysis — summary, flags, counter-offers, and red-line matches — without re-uploading or re-running analysis.

**Blocked by:** 03 (analyzeDocument seam), 04 (Counter-offer drafting per flag), 05 (Editable red-line list + red-line match reporting)

**Status:** done (RLS and no-model-call proven in tests; not yet run on a hosted Supabase project; see BUILD-REPORT.md)

- [x] A user's library lists all their past uploaded documents.
- [x] Opening a past document shows its previously generated summary, flags (with severity, citation, rationale), counter-offers, and red-line matches — loaded from storage, not regenerated.
- [x] Re-opening a document does not trigger a new model call.
- [x] Library and saved analyses remain scoped to the owning user (consistent with the row-level security established in ticket 02).
