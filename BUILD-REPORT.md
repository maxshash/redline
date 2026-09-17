# Build report: Redline v1

Unattended build, 2026-09-16 → 2026-09-17, branch `design/facts-panel-landing`.

**Status:** all seven tickets are done. `npm run build` passes, and `npm test` passes: 425 tests in 21 files, no key needed. `npm run smoke` ran against the real model: 8 of 8 proposed flags survived verification, and all 8 planted clauses were found. Nothing ran against a real Supabase project, because none exists yet. Every Supabase path is built and tested against the migration SQL in PGlite, but it hasn't touched a hosted project.

## Tickets

| Ticket | Status | Commit | Notes |
|---|---|---|---|
| Fixtures | done | `8b4f02c` | Adhesion contract with 8 planted clauses covering all 7 PRD types; clean agreement with none. I checked every sidecar sentence verbatim, separately from the agent's own test. |
| 01 Scaffold + Supabase auth | done | `8d78403` | Email/password via `@supabase/ssr`, sessions refreshed in `proxy.ts`. Live sign-up and session persistence unverified; no Vercel deploy. |
| 02 Upload, extraction, private storage | done | `04b5e8b` | PDF/DOCX/TXT extracted in the browser; scanned PDFs rejected; owner-only RLS on `documents`. |
| 03 analyzeDocument | done | `b0e9992` | Citations exist only after verification; OpenRouter client with the provider pin. |
| 04 Counter-offers | done | `59ceafb` | Second model call that only accepts cited flags, enforced by the compiler. |
| 05 Red lines + matching | done | `c0444ac` | `/red-lines` CRUD; matches are a separate list from flags; 25-entry cap in the DB. |
| 06 Question box | done, after 1 send-back | `32204d3` | The live run marked 2 answerable questions not-in-document. Prompt fix brought the live run to 7/7. |
| 07 Library | done | `b4698f5` | `/library/[id]` reopens with zero model calls; every stored analysis is re-verified on read and write. |

No ticket was blocked. One subagent died on a usage limit partway through ticket 06; I resumed it with its work intact, and that didn't count as a failure.

Every ticket's `Status:` line and criteria in `.scratch/redline-v1/issues/` are updated. Criteria that can't be proven without Supabase or Vercel are left unticked or say so on the line.

## Decisions made while you were away

1. **Dependencies.** CLAUDE.md says to ask first; you told me to decide.
   - Added: `vitest` (there was no test runner), `@supabase/supabase-js` + `@supabase/ssr` (your Supabase answer), `pdfjs-dist` + `mammoth` (PDF/DOCX text extraction in the browser, no OCR), `@electric-sql/pglite` (dev only: runs the real migrations in Postgres-in-WASM so the RLS tests execute without Docker or Supabase), `tsx` (dev only: runs the smoke script).
   - Nothing else was added.
2. **No setup step ran.** The app already existed at the repo root (Next 16.3, landing page), and DESIGN.md existed.
3. **Shared brief.** The rules and fixed architecture every subagent followed are in `.scratch/redline-v1/build-brief.md`.
4. **One ticket at a time.** Every ticket touched a screen, so the condition for running two in parallel never held.
5. **RLS tested in PGlite.** Docker's daemon wasn't running, and there's no Supabase CLI or Postgres. The tests run the actual migration files over a small stand-in for Supabase's `auth` schema: `auth.users`, `auth.uid()` from the JWT claim, the `anon`/`authenticated` roles, and default grants. For `documents` and `analyses`, the agent disabled the policy (or its ownership clause) and confirmed the negative tests then failed, so those tests really exercise the policies. That control check wasn't repeated for `red_lines`. This proves the SQL, not hosted behaviour.
6. **analyzeDocument signature.** It shipped as `analyzeDocument(text, deps)` in ticket 03 and gained `redLines` in ticket 05, which reached the spec's signature without ever carrying an unused parameter.
7. **Whitespace-tolerant citation lookup.** Pasted text keeps its line breaks, so a model quote may differ from the document only in whitespace. The lookup allows that, but stores the document's own span, so a stored citation is always an exact substring. Case, quote marks, dashes and wording are never tolerated.
8. **Rationales that invent figures are rewritten, not dropped.** A rationale naming a number its quote doesn't contain gets a hedged sentence built from tier and axis instead. The flag stays (ADR 0004). This includes computed figures: "a fifteen-day window" from 45−30 is treated as unsupported.
9. **Counter-offers are a second model call** typed to accept only verified `Flag` values. If that call fails, flags show "Redline couldn't suggest other wording" and the rest of the analysis still arrives.
10. **Analysis starts from a button, not on paste,** because every call costs money.
11. **The landing CTA now points to `/analyze`, not `/sign-up`.** You required that a pasted document can be analysed without an account. Only the two hrefs changed; the design didn't.
12. **Anyone can analyse; only signed-in users can save.** Red lines, when used, are loaded on the server from the user's stored list, never from the request.
13. **Question box.**
    - A not-in-document result always uses Redline's own wording, never the model's.
    - An answer is shown only if it quotes verified sentences and every figure in it appears in them.
    - Answers look deliberately different from flags (double rule, no tier, "Answered from your document"). That decision is recorded in `.impeccable/surfaces/app-shell.md`.
14. **Saving analyses works both ways.**
    - Saving after a check sends the analysis, which the server re-verifies against the text being saved.
    - Checking a saved document stores the result server-side.
    - A stored analysis that fails re-verification on read shows "Needs a new check", never the analysis.
15. **Limits.**
    - Document text: 200,000 characters. Title: 200. Red line: 300 characters, 25 per user. Question: 500 characters.
    - Files over 25 MB are rejected.
    - `maxDuration = 120` on `/analyze`; not checked against your Vercel plan.
16. **Scan detection.** A PDF page with under 20 letters/digits that draws an image counts as scanned. If any page is scanned, the whole file is rejected, so an analysis never silently skips pages.
17. **Not built, because they aren't on the scope list:** deleting a document from the library, rate limiting, password reset.

## Live model results

Model: whatever `OPENROUTER_MODEL` says, pinned to Fireworks (`allow_fallbacks: false`, `require_parameters: true`), reasoning effort low, strict JSON schema.

- **2026-09-16 ~23:10: blocker, then cleared.**
  - Every pinned request, even a one-line ping, hung with 0 bytes.
  - The key was valid ($5 limit, $0 used). OpenRouter's endpoint list showed the Fireworks endpoint for this model degraded (status −2, 87.8% uptime over 30 min) while other providers were healthy.
  - I didn't loosen the pin. By ~23:20 a ping came back in 1 s.
  - If this recurs, it's the provider pin, not the code.
- **Smoke #1** (after ticket 05): 8 proposed, **8 kept**, 0 dropped for no source. All 8 planted clauses found, all 3 red-line cases found, 8/8 counter-offers drafted.
- **Smoke #2** (after ticket 06's first pass):
  - 7 proposed, 7 kept; the liability cap (worth-noting) was missed this run.
  - Questions scored **5/7**. The model itself chose not-in-document for "What is my hourly rate?" and "How long does the client have to pay an invoice?". It didn't know "my" meant the signing party, and it read a condition ("unless a Statement of Work…") as a reason not to answer.
  - That was the send-back. The fix is prompt-only; no guarantee was weakened.
- **Final smoke** (all tickets in, 49.7 s):
  - **8 proposed, 8 kept**, 0 dropped (no source / invalid / duplicate), 1 rationale rewritten.
  - **All 8 planted clauses found.** Tier agreement 7/8: broad IP assignment came back critical where the fixture expects serious. Across all three runs, every tier disagreement ranked a clause *heavier* than expected, never lighter.
  - Counter-offers: 8 drafted, 0 unavailable.
  - Red-line matches: 3 proposed, 3 kept, **all 3 cases found**, including both below the dangerous-clause bar.
  - Questions: **7/7 as expected.** All 4 supported questions answered with verified quotes; all 3 unsupported came back not-in-document.
- **Live eval** (`npm run eval`, once, at the end): **14 of 15 passed.**
  - Both analysis checks passed: adhesion contract (citations verbatim, ≥80% of planted critical/serious clauses flagged, every red-line case matched) and clean agreement (citations verbatim, red-line cases matched, **zero critical or serious flags**).
  - Answers: 12 of 13 passed. The one failure: on the clean agreement, "Am I allowed to work for other companies in the same industry?" was downgraded to not-in-document because the answer included a detail its quotes didn't contain.
  - That errs on the safe side (an honest non-answer, not a fabricated one), but it's a false negative worth looking at. I didn't send ticket 06 back a second time for a nondeterministic single miss.

## Could not verify

**Supabase** (no project exists):
- Real sign-up, sign-in, email confirmation, the session surviving a reload, token refresh in the proxy, and sign-out clearing cookies.
- Any migration on hosted Supabase. All three (`documents`, `red_lines`, `analyses`) have only run in PGlite with the auth stand-in.
- The live save round trip (document + analysis), the library query that fetches the newest analysis per document (supabase-js `referencedTable` order/limit), red-line CRUD, and the 25-entry trigger.
- The signed-in screens rendered with data: sign-in form, frame, filled library, `/library/[id]`, `/red-lines`.

**Deploy:** no Vercel deploy was attempted (no CLI, no project link).

**In a browser:**
- Ticket 02's agent opened the production build and confirmed PDF and DOCX extraction work in the bundle, scans and images are rejected, and no request carries the file.
- The analysis result, counter-offer blocks, red-line overprints, question box and span marking were never looked at in a browser. Only the build and tests covered them. No impeccable review round was run, as instructed.

**Lint:** `npx eslint` crashes on the existing `eslint.config.mjs` ("Converting circular structure to JSON") before it checks any file. That was true before this build, and none of the new code has been linted.

## Worth your attention

- **Public cost exposure.** `/analyze` and the question box make paid model calls for anyone, signed in or not, with no rate limit. You required signed-out analysis; limiting it is your call.
- **`NEXT_PUBLIC_*` values are baked in at build time.** `/sign-in` and `/sign-up` were prerendered with Supabase absent, so rebuild or restart `next dev` after adding the variables.
- **Email template.** For confirmation links to work across devices, set Supabase's confirm-signup template to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`, and add your site URL to the allowed redirect URLs. The handler also accepts the default `code` link.
- **Tiers run hot.** Across three live runs the model ranked some serious clauses critical. That's inside ADR 0004's tolerance, and the clean agreement stayed clean, but it's the number to watch.

## First commands when you sit down

```sh
git pull && npm install
npm test                  # 425 tests, no key or Supabase needed
npm run build
npm run smoke             # real model: prints flags with source sentences, counts, and Q&A
npm run eval              # real model: recall, clean-document and red-line checks

# Then, once the Supabase project exists:
#  1. Put NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
#     (and in Vercel's project env).
#  2. Run the migrations in order, in the SQL editor or with `supabase db push`:
ls supabase/migrations/   # documents → red_lines → analyses
#  3. Set the confirm-signup email template (see above), then:
npm run dev               # sign up, save a document, add a red line, reopen it from /library
```
