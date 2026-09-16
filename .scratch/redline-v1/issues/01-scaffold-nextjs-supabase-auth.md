# 01: Scaffold: Next.js app with Supabase auth

**What to build:** a deployed Next.js app where a user can sign up, log in, log out, and land on an empty authenticated dashboard. Supabase auth wired end-to-end — real sessions, not a UI shell.

**Blocked by:** None (can start immediately)

**Status:** done (built against the Supabase client; not yet run against a live Supabase project or deployed; see BUILD-REPORT.md)

- [x] (code + action tests; live Supabase unverified) A user can sign up with email/password (or the chosen Supabase auth method) and lands on an authenticated dashboard route.
- [x] (code + action tests; live Supabase unverified) A user can log out and is redirected away from authenticated routes.
- [x] An unauthenticated visitor hitting a dashboard route is redirected to login, not shown an empty/broken page.
- [ ] (implemented via @supabase/ssr cookies and proxy refresh; unverifiable without a Supabase project) Session persists across a page reload.
- [ ] (env-driven config done, .env.example added; no deploy attempted) App deploys to Vercel with Supabase credentials read from environment variables (never committed).
