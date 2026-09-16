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

## Could not verify (Supabase / key missing)

- No Supabase project: sign-up, sessions and the library have not run against a real Supabase instance.
- No Vercel deploy was attempted (no Vercel CLI, no project link).

## First commands when you sit down

(filled in at the end)
