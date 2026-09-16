export interface SupabaseEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Each variable is named in full so Next.js can inline it into browser
 * bundles at build time. Passing `process.env` around as an object would
 * leave the browser with an empty object.
 */
function readSupabaseEnv(): SupabaseEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/** The project URL and anon key, or null when either is missing or blank. */
export function getSupabaseConfig(env: SupabaseEnv = readSupabaseEnv()): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(env: SupabaseEnv = readSupabaseEnv()): boolean {
  return getSupabaseConfig(env) !== null;
}
