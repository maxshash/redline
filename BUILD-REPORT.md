# Build report: Redline v1

Unattended build started 2026-09-16 on branch `design/facts-panel-landing`.
This file is updated as the build goes; the final version is at the bottom of the history.

## Tickets

| Ticket | Status | Notes |
|---|---|---|
| Fixtures | in progress | |
| 01 Scaffold + Supabase auth | open | |
| 02 Upload, extraction, private storage | open | |
| 03 analyzeDocument | open | |
| 04 Counter-offers | open | |
| 05 Red lines + matching | open | |
| 06 Question box | open | |
| 07 Library | open | |

## Decisions made while you were away

1. **Dependencies.** CLAUDE.md says ask before adding one; you told me to decide instead. Approved up front: `vitest` (no test runner existed), `@supabase/supabase-js` + `@supabase/ssr` (your Supabase answer), `pdfjs-dist` + `mammoth` (PDF and DOCX text extraction in the browser, no OCR), `@electric-sql/pglite` (dev only: runs the real SQL migrations in Postgres-in-WASM so the row-level security tests execute without Docker or a Supabase project), `tsx` (dev only: runs the smoke script, which imports the TypeScript pipeline).
2. **The app is at the repo root already** (Next 16.3, landing page and a placeholder sign-up page), and DESIGN.md exists, so neither setup step ran.
3. **Shared brief.** Rules and architecture every subagent follows are in `.scratch/redline-v1/build-brief.md`, so each ticket brief stays short and consistent.
4. **Tickets run one at a time.** Every ticket touches a screen, so the "two at once" condition never held.
5. **Row-level security testing without Docker.** Docker's daemon isn't running and no Supabase CLI or Postgres is installed. The migrations are tested in PGlite, with a small stand-in for Supabase's `auth` schema (`auth.users`, `auth.uid()` reading the JWT claim, and the `anon`/`authenticated` roles), built the way Supabase defines them. That tests the policy SQL, but it doesn't prove behaviour on a hosted Supabase project.

6. **analyzeDocument signature.** The spec says `analyzeDocument(text, redLines)`. Ticket 03 shipped `analyzeDocument(text, deps)`, and ticket 05 adds `redLines`, so nothing ever carried an unused parameter or an always-empty field.
7. **Whitespace-tolerant citation lookup.** Pasted and .txt text keeps its line breaks, so a model quote can differ from the document only in whitespace. The lookup allows that difference but stores the document's own span, so the stored citation is always an exact substring. Nothing else is tolerated: not case, quote marks, dashes or wording.
8. **Rationales that invent figures are rewritten, not dropped.** If a rationale names a number the quoted sentence doesn't contain, its wording is replaced with a hedged sentence built from the tier and axis. The flag stays (ADR 0004).
9. **Counter-offers are a second model call** that only accepts already-cited flags (ticket 04). The type system then enforces the gate, not a convention.
10. **Analysis starts from a button**, not automatically on paste, because every call costs money.

## Blockers and live-model notes

- **2026-09-16 ~23:10: the pinned provider timed out.** Every request pinned to Fireworks (`allow_fallbacks: false`, as instructed) hung with 0 bytes until the client timed out, even a one-line ping. The key itself is valid (limit $5, usage $0). OpenRouter's endpoint list for `OPENROUTER_MODEL` showed the Fireworks endpoint degraded (status -2, 87.8% uptime over 30 min) while other providers were healthy. I didn't loosen the pin: that's your call, and working around it would change what the build proves. I'll retry at the end.

## Could not verify (Supabase / key missing)

- No Supabase project: sign-up, sessions and the library have not run against a real Supabase instance.
- No Vercel deploy was attempted (no Vercel CLI, no project link).

## First commands when you sit down

(filled in at the end)
