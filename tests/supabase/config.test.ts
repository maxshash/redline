import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

describe("isSupabaseConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true when both variables are set", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };
    expect(isSupabaseConfigured(env)).toBe(true);
    expect(getSupabaseConfig(env)).toEqual({ url: "https://project.supabase.co", anonKey: "anon-key" });
  });

  it("is false when either variable is missing or blank", () => {
    expect(isSupabaseConfigured({})).toBe(false);
    expect(isSupabaseConfigured({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" })).toBe(false);
    expect(isSupabaseConfigured({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key" })).toBe(false);
    expect(
      isSupabaseConfigured({ NEXT_PUBLIC_SUPABASE_URL: "  ", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key" }),
    ).toBe(false);
    expect(getSupabaseConfig({})).toBeNull();
  });

  it("reads process.env by default", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    expect(isSupabaseConfigured()).toBe(true);
  });
});
