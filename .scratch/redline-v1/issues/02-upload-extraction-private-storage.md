# 02: Upload, client-side extraction, and private document storage

**What to build:** a user uploads a document, text is extracted in the browser, only the extracted text is persisted to Supabase, and the document appears in that user's library. Row-level security enforced so a document is only ever readable by its uploader — this is where "documents stay private to me" actually gets built and tested, not assumed.

**Blocked by:** 01 (Scaffold: Next.js app with Supabase auth)

**Status:** ready-for-agent

- [ ] A user can upload a document (contract/lease/freelance agreement/ToS) and see text extraction happen client-side.
- [ ] Only the extracted text is sent to and stored in Supabase — the original file is never uploaded to the server or persisted anywhere.
- [ ] The uploaded document appears in the uploading user's library immediately after upload.
- [ ] Row-level security (or equivalent) enforced at the database/API layer so a document is only readable by its uploader.
- [ ] Negative test: an authenticated user B cannot read user A's document via a direct API/DB call, not just "no UI link to it."
- [ ] No OCR path exists; a scanned/image-only file either fails extraction gracefully or is rejected, with no silent mangled-text result.
