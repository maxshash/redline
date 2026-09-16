import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/**
 * A real Postgres (PGlite, in-process) set up the way a Supabase project is,
 * with every migration in supabase/migrations applied in filename order.
 *
 * Supabase provides the `auth` schema, `auth.uid()` and the `anon` and
 * `authenticated` roles; they aren't in our migrations, so a small shim
 * recreates the parts policies depend on, following Supabase's own
 * definitions. Tests then run queries *as* a role and user, so row-level
 * security is enforced exactly as PostgREST would enforce it.
 */

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "supabase", "migrations");

const SUPABASE_SHIM = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    created_at timestamptz not null default now()
  );

  -- As in Supabase: the subject claim of the request's JWT, or null.
  create function auth.uid() returns uuid
    language sql stable
    as $$
      select nullif(
        coalesce(
          current_setting('request.jwt.claim.sub', true),
          (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
        ),
        ''
      )::uuid
    $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  -- As in Supabase: the API roles can use public, and get full table
  -- privileges by default. Row-level security is what actually restricts them.
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

export interface SupabaseTestDb {
  db: PGlite;
  /** Insert a row into auth.users and return its id. */
  createUser(email: string): Promise<string>;
  /** Run `fn` as a signed-in user: role `authenticated`, JWT subject `userId`. */
  asUser<T>(userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /** Run `fn` as a signed-out API request: role `anon`, no JWT subject. */
  asAnon<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** A fresh database with the Supabase shim and every migration applied. */
export async function createSupabaseTestDb(): Promise<SupabaseTestDb> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const file of migrationFiles()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    } catch (error) {
      throw new Error(`migration ${file} failed: ${(error as Error).message}`);
    }
  }

  async function asRole<T>(role: "anon" | "authenticated", sub: string | null, fn: (tx: Transaction) => Promise<T>) {
    return db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [sub ?? ""]);
      await tx.exec(`set local role ${role}`);
      return fn(tx);
    });
  }

  return {
    db,
    async createUser(email) {
      const { rows } = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
      return rows[0].id;
    },
    asUser: (userId, fn) => asRole("authenticated", userId, fn),
    asAnon: (fn) => asRole("anon", null, fn),
    close: () => db.close(),
  };
}
