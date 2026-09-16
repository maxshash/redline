import type { AuthErrorLike, AuthPort } from "@/lib/auth/actions";

type Call = { method: keyof AuthPort; args: unknown[] };

export interface FakeAuthOptions {
  signInError?: AuthErrorLike | null;
  signUpError?: AuthErrorLike | null;
  /** Whether sign-up returns a session (confirm email off) or not (confirm email on). */
  signUpReturnsSession?: boolean;
  signOutError?: AuthErrorLike | null;
  verifyOtpError?: AuthErrorLike | null;
  exchangeCodeError?: AuthErrorLike | null;
}

/**
 * A stand-in for `supabase.auth` at the AuthPort boundary. It records calls
 * and returns what the test configures; it holds no logic of its own.
 */
export function fakeAuth(options: FakeAuthOptions = {}): AuthPort & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async signInWithPassword(credentials) {
      calls.push({ method: "signInWithPassword", args: [credentials] });
      return { error: options.signInError ?? null };
    },
    async signUp(credentials) {
      calls.push({ method: "signUp", args: [credentials] });
      if (options.signUpError) {
        return { data: { session: null, user: null }, error: options.signUpError };
      }
      return {
        data: {
          user: { id: "user-1" },
          session: options.signUpReturnsSession ? { access_token: "token" } : null,
        },
        error: null,
      };
    },
    async signOut() {
      calls.push({ method: "signOut", args: [] });
      return { error: options.signOutError ?? null };
    },
    async verifyOtp(params) {
      calls.push({ method: "verifyOtp", args: [params] });
      return { error: options.verifyOtpError ?? null };
    },
    async exchangeCodeForSession(code) {
      calls.push({ method: "exchangeCodeForSession", args: [code] });
      return { error: options.exchangeCodeError ?? null };
    },
  };
}
