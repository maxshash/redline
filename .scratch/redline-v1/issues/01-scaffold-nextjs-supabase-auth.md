# 01: Scaffold: Next.js app with Supabase auth

**What to build:** a deployed Next.js app where a user can sign up, log in, log out, and land on an empty authenticated dashboard. Supabase auth wired end-to-end — real sessions, not a UI shell.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A user can sign up with email/password (or the chosen Supabase auth method) and lands on an authenticated dashboard route.
- [ ] A user can log out and is redirected away from authenticated routes.
- [ ] An unauthenticated visitor hitting a dashboard route is redirected to login, not shown an empty/broken page.
- [ ] Session persists across a page reload.
- [ ] App deploys to Vercel with Supabase credentials read from environment variables (never committed).
