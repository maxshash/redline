# Build brief: rules every implementation agent follows

Read this whole file before touching code. It carries decisions the owner made
and architecture the orchestrator fixed so tickets stay consistent. The owner is
away: do not ask questions. Where you would ask, decide, and put the decision
and its reason in your final report.

## Read first

`CLAUDE.md`, `CONTEXT.md`, `PRD.md`, `.scratch/redline-v1/spec.md`, the ADRs in
`docs/adr/` that your ticket touches, and your ticket file. If your ticket has a
screen, also read `DESIGN.md`, `PRODUCT.md` and `.impeccable/surfaces/app-shell.md`.
This is Next.js 16: read the relevant guide in `node_modules/next/dist/docs/`
before writing Next.js code (for example `01-app/01-getting-started/16-proxy.md`:
middleware is now `proxy`). Heed deprecation notices.

## Owner's answers (these override "ask first" in CLAUDE.md)

1. **Model.** The model is whatever `OPENROUTER_MODEL` says, called through
   OpenRouter's OpenAI-compatible endpoint
   (`https://openrouter.ai/api/v1/chat/completions`) with `OPENROUTER_API_KEY`.
   Every request pins the provider:
   `provider: { order: ["fireworks"], allow_fallbacks: false, require_parameters: true }`,
   sets `reasoning: { effort: "low" }`, and asks for structured JSON output
   (`response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`)
   for every analysis and answer call. **Never write a model id into code**,
   tests included (tests use an obviously fake id such as `"test/model"`).
2. **Supabase.** No project exists yet. Build sign-in, the library and red lines
   against the real Supabase client (`@supabase/supabase-js` + `@supabase/ssr`),
   reading `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Every
   table and policy is a SQL migration file under `supabase/migrations/`, which
   the owner runs by hand later. **The app must start and analyse a pasted
   document with those two variables absent**; only the library and red lines
   need an account. **Do not mock auth in the product** (no fake users, no
   bypass flags). When the variables are absent, account features say plainly
   that accounts are not available yet.

## What does not count as done

A ticket containing any of these is still open:
- a function that returns a fixed value;
- a TODO, a "not implemented" error, a placeholder screen;
- a test that checks a file exists or a function is defined;
- a test that mocks the thing it is meant to test.

Stubbing the *model* is allowed and expected: the model is a dependency of the
seams, not the thing under test. What is under test is the product's own logic:
citation verification, severity/red-line separation, counter-offer gating,
grounding, persistence, access rules, request construction.

## Architecture (fixed, keep to it)

- `lib/model/` — `ModelClient` interface, roughly
  `completeJson(req: { name: string; system: string; user: string; schema: object }): Promise<unknown>`.
  `createOpenRouterClient({ apiKey, model, fetch? })` implements it;
  `modelClientFromEnv()` reads the env vars and throws a clear error if the key
  or model is missing. The seams take the client as an injected dependency.
- `lib/analysis/` — `analyzeDocument(text, redLines, deps) → Analysis`.
  Model output is untrusted: parse/validate it, and turn every quoted clause into
  a `Citation` only through one constructor that checks the quote is an exact
  substring of the document text. A candidate whose quote fails is dropped
  (and counted, so the smoke script can report how many survived). The `Flag`
  and `RedLineMatch` types hold a `Citation`, so an uncited flag cannot be
  constructed. Severity tiers are the named strings `critical | serious |
  worth-noting`; no numeric score anywhere. Red-line matches are a separate
  array on `Analysis`, never merged with flags.
- `lib/answer/` — `answerQuestion(text, question, deps) → Answer`, no access to
  red lines or analysis. An answer that claims support must carry citations that
  verify against the text; otherwise it becomes an honest "the document does not
  say" answer.
- `lib/supabase/` — browser/server clients and an `isSupabaseConfigured()` check.
- Test runner: **Vitest** (`npm test` = `vitest run`). Typecheck: `npx tsc --noEmit`.
  Tests live in `tests/`. Shared test helpers in `tests/support/`.
- Fixtures: `tests/fixtures/adhesion-contract.txt` + `adhesion-contract.json`
  (planted clauses, exact sentences, expected severity bands, red-line cases,
  Q&A cases) and `tests/fixtures/clean-agreement.txt` + `clean-agreement.json`.
  Every test that needs a document uses these. In tests the model client is a
  stub whose payloads are built from the sidecar JSON, so the suite runs
  without a key. Do not edit the fixtures to make a test pass.
- Dependencies approved by the orchestrator: `vitest`, `@supabase/supabase-js`,
  `@supabase/ssr`, `@electric-sql/pglite` (dev, runs migrations in tests),
  `pdfjs-dist`, `mammoth`, `tsx` (dev, runs the smoke script). Anything else:
  don't add it, find another way, and say so in your report.

## Screens

Every screen obeys `DESIGN.md`, `PRODUCT.md` and the app shell brief. Reuse the
tokens and fonts already in `app/globals.css` and `app/fonts.ts`. Do **not**
start an impeccable direction round or anything that opens a browser and waits
for a person. The citation is never truncated or hidden behind a disclosure;
severity is rule weight; a red-line match is an overprint, never a severity rule.

## Copy

All copy a reader sees (labels, buttons, errors, empty states, the clean
result) goes through the humanizer skill (`humanizer:humanizer`, via the Skill
tool) before you finish. Copy that sounds like a model wrote it is a bug.

## Secrets

Never commit a secret. `.env.local` is gitignored; you may add `.env.example`
with empty values. Never print the API key.

## Before you report back

Run `npx tsc --noEmit`, your ticket's tests, and `npm test`. All must pass. Do
not commit (the orchestrator commits). Report: files changed, tests added and
what each proves, decisions made and why, anything you could not verify.
