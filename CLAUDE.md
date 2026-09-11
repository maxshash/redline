# Redline

Upload a contract, lease, freelance agreement, or ToS. Get back:
- a plain-English summary
- clauses ranked by severity, each with the exact source sentence
- a drafted counter-offer per flagged clause
- a question box that answers only from the document
- an editable list of the user's own red lines, which drives the analysis
- a saved library of past documents

## Scope

Build only what's listed above, then stop. If something looks like the obvious next step but isn't on that list, ask first.

Excluded on purpose: payments/billing, OCR, sharing documents between users. This version exists to prove the analysis can be trusted, and none of those three make it more trustworthy — OCR actively undermines it, since a citation is worthless when the text it points at was misread.

## Stack (settled, don't reconsider)

- Next.js, deployed on Vercel. Supabase for auth and database. Model calls go through OpenRouter.
- The uploaded file is parsed in the browser. Only the extracted text is ever stored, never the original file.

## Non-negotiable behavior

- Every risk flag cites the exact source sentence it came from. A flag with no visible source is a bug.
- State only what the document says. Where the text doesn't support a claim, don't make it.
- Any copy the user reads — landing page, UI labels, error messages, empty states — must go through the humanizer skill before it's committed. Copy that sounds like a model wrote it is a bug, not a style nitpick.

## Standing rules

- Secrets go in `.env.local` (gitignored). Never commit one — a key is public the moment it's pushed and has to be rotated.
- Ask before adding a dependency.

## Read before you act

- `research/summary.md` — the user research. Read it before deciding what the product should do.
- `PRD.md` (once it exists) — the brief. Read it before building.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — `docs/adr/` at the repo root holds architecture decisions. See `docs/agents/domain.md`.

### Grilling

When running a grilling-style interview, always give a concrete recommended answer per question, not just the question.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
