# 01: Scaffold: Next.js app with Supabase auth

**What to build:** a deployed Next.js app where a user can sign up, log in, log out, and land on an empty authenticated dashboard. Supabase auth wired end-to-end — real sessions, not a UI shell.

**Blocked by:** None (can start immediately)

**Status:** done (deployed to Vercel against a live Supabase project; the FINDINGS.md browser pass confirmed the signed-in session in production. Sign-up and sign-out are still unverified there)

- [x] (code + action tests; live Supabase unverified) A user can sign up with email/password (or the chosen Supabase auth method) and lands on an authenticated dashboard route.
- [x] (code + action tests; live Supabase unverified) A user can log out and is redirected away from authenticated routes.
- [x] An unauthenticated visitor hitting a dashboard route is redirected to login, not shown an empty/broken page.
- [x] (confirmed in production by the FINDINGS.md browser pass: reloads, back and forward kept the session) Session persists across a page reload.
- [x] (deployed; the variables are listed in readme.md and set on Vercel) App deploys to Vercel with Supabase credentials read from environment variables (never committed).
