Production: https://redline-maxshash-1153s-projects.vercel.app

# Redline

Upload a contract, lease, freelance agreement, or ToS and get back a plain-English summary, clauses ranked by severity with the exact source sentence, and a drafted counter-offer for each flagged clause. See `CLAUDE.md` for what's in scope.

## Production settings

These four settings are set on Vercel and in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
