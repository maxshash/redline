import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

/** A Supabase client for Client Components, or null when not configured. */
export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.anonKey);
}
