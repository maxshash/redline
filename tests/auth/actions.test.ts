import { describe, expect, it } from "vitest";
import {
  AUTH_COPY,
  CONFIRM_FAILED_PATH,
  describeAuthError,
  runConfirm,
  runSignIn,
  runSignOut,
  runSignUp,
} from "@/lib/auth/actions";
import { fakeAuth } from "../support/fake-auth";

const input = (email: string, password: string, next: string | null = null) => ({ email, password, next });

describe("runSignIn", () => {
  it("reports accounts as unavailable when Supabase isn't configured", async () => {
    expect(await runSignIn(input("a@b.co", "secret-password"), null)).toEqual({
      kind: "state",
      state: { status: "unavailable" },
    });
  });

  it("validates before calling Supabase", async () => {
    const auth = fakeAuth();
    expect(await runSignIn(input("", "x"), auth)).toMatchObject({ state: { message: AUTH_COPY.missingEmail } });
    expect(await runSignIn(input("not-an-email", "x"), auth)).toMatchObject({
      state: { message: AUTH_COPY.invalidEmail, email: "not-an-email" },
    });
    expect(await runSignIn(input("a@b.co", ""), auth)).toMatchObject({ state: { message: AUTH_COPY.missingPassword } });
    expect(auth.calls).toEqual([]);
  });

  it("redirects to a safe next after signing in", async () => {
    const auth = fakeAuth();
    const outcome = await runSignIn(input(" a@b.co ", "pw", "/library/abc"), auth);
    expect(outcome).toEqual({ kind: "redirect", to: "/library/abc" });
    expect(auth.calls).toEqual([{ method: "signInWithPassword", args: [{ email: "a@b.co", password: "pw" }] }]);
  });

  it("goes to /library when next is missing or unsafe", async () => {
    expect(await runSignIn(input("a@b.co", "pw"), fakeAuth())).toEqual({ kind: "redirect", to: "/library" });
    expect(await runSignIn(input("a@b.co", "pw", "//evil.com"), fakeAuth())).toEqual({
      kind: "redirect",
      to: "/library",
    });
  });

  it("maps a wrong password to plain words and keeps the email", async () => {
    const auth = fakeAuth({
      signInError: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 },
    });
    expect(await runSignIn(input("a@b.co", "wrong"), auth)).toEqual({
      kind: "state",
      state: { status: "error", message: AUTH_COPY.invalidCredentials, email: "a@b.co" },
    });
  });

  it("tells an unconfirmed user to open the confirmation email", async () => {
    const auth = fakeAuth({ signInError: { message: "Email not confirmed", code: "email_not_confirmed", status: 400 } });
    expect(await runSignIn(input("a@b.co", "pw"), auth)).toMatchObject({
      state: { status: "error", message: AUTH_COPY.emailNotConfirmed },
    });
  });
});

describe("runSignUp", () => {
  it("reports accounts as unavailable when Supabase isn't configured", async () => {
    expect(await runSignUp(input("a@b.co", "long-enough"), { auth: null, origin: null })).toEqual({
      kind: "state",
      state: { status: "unavailable" },
    });
  });

  it("rejects a short password without calling Supabase", async () => {
    const auth = fakeAuth();
    expect(await runSignUp(input("a@b.co", "short"), { auth, origin: null })).toMatchObject({
      state: { status: "error", message: AUTH_COPY.shortPassword },
    });
    expect(auth.calls).toEqual([]);
  });

  it("asks the person to check their email when Supabase returns no session", async () => {
    const auth = fakeAuth({ signUpReturnsSession: false });
    const outcome = await runSignUp(input("a@b.co", "long-enough", "/red-lines"), {
      auth,
      origin: "https://redline.example",
    });
    expect(outcome).toEqual({ kind: "state", state: { status: "check-email", email: "a@b.co" } });
    expect(auth.calls[0].args[0]).toEqual({
      email: "a@b.co",
      password: "long-enough",
      options: { emailRedirectTo: "https://redline.example/auth/confirm?next=%2Fred-lines" },
    });
  });

  it("never puts an unsafe next into the confirmation link", async () => {
    const auth = fakeAuth();
    await runSignUp(input("a@b.co", "long-enough", "https://evil.com"), { auth, origin: "https://redline.example" });
    expect(auth.calls[0].args[0]).toMatchObject({
      options: { emailRedirectTo: "https://redline.example/auth/confirm?next=%2Flibrary" },
    });
  });

  it("redirects straight in when Supabase returns a session", async () => {
    const auth = fakeAuth({ signUpReturnsSession: true });
    expect(await runSignUp(input("a@b.co", "long-enough"), { auth, origin: null })).toEqual({
      kind: "redirect",
      to: "/library",
    });
  });

  it("maps an existing account and a weak password", async () => {
    const exists = fakeAuth({ signUpError: { message: "User already registered", code: "user_already_exists", status: 422 } });
    expect(await runSignUp(input("a@b.co", "long-enough"), { auth: exists, origin: null })).toMatchObject({
      state: { message: AUTH_COPY.accountExists },
    });
    const weak = fakeAuth({ signUpError: { message: "Password is known to be weak", code: "weak_password", status: 422 } });
    expect(await runSignUp(input("a@b.co", "password1"), { auth: weak, origin: null })).toMatchObject({
      state: { message: AUTH_COPY.weakPassword },
    });
  });
});

describe("describeAuthError", () => {
  it("covers rate limits, network failure and the unknown case", () => {
    expect(describeAuthError({ message: "x", code: "over_email_send_rate_limit", status: 429 })).toBe(AUTH_COPY.rateLimited);
    expect(describeAuthError({ message: "x", status: 429 })).toBe(AUTH_COPY.rateLimited);
    expect(describeAuthError({ message: "fetch failed", name: "AuthRetryableFetchError", status: 0 })).toBe(
      AUTH_COPY.unreachable,
    );
    expect(describeAuthError({ message: "x", code: "signup_disabled" })).toBe(AUTH_COPY.signupsClosed);
    expect(describeAuthError({ message: "Database error saving new user", status: 500 })).toBe(AUTH_COPY.unexpected);
  });

  it("never shows Supabase's raw message", () => {
    const raw = "Database error saving new user";
    expect(describeAuthError({ message: raw, status: 500 })).not.toContain(raw);
  });
});

describe("runSignOut", () => {
  it("signs out and redirects to the landing page", async () => {
    const auth = fakeAuth();
    expect(await runSignOut(auth)).toEqual({ kind: "redirect", to: "/" });
    expect(auth.calls).toEqual([{ method: "signOut", args: [] }]);
  });

  it("does not redirect as if signed out when sign-out fails", async () => {
    const auth = fakeAuth({ signOutError: { message: "boom", status: 500 } });
    expect(await runSignOut(auth)).toEqual({ kind: "error", message: AUTH_COPY.signOutFailed });
  });

  it("redirects home when Supabase isn't configured, since there is no session", async () => {
    expect(await runSignOut(null)).toEqual({ kind: "redirect", to: "/" });
  });
});

describe("runConfirm", () => {
  it("verifies a token hash and goes to next", async () => {
    const auth = fakeAuth();
    const result = await runConfirm({ tokenHash: "hash", type: "signup", code: null, next: "/red-lines" }, auth);
    expect(result).toEqual({ to: "/red-lines" });
    expect(auth.calls).toEqual([{ method: "verifyOtp", args: [{ type: "signup", token_hash: "hash" }] }]);
  });

  it("exchanges a PKCE code when there is no token hash", async () => {
    const auth = fakeAuth();
    expect(await runConfirm({ tokenHash: null, type: null, code: "abc", next: null }, auth)).toEqual({ to: "/library" });
    expect(auth.calls).toEqual([{ method: "exchangeCodeForSession", args: ["abc"] }]);
  });

  it("sends a failed or expired link to sign-in with a notice", async () => {
    const auth = fakeAuth({ verifyOtpError: { message: "Token has expired", code: "otp_expired", status: 403 } });
    expect(await runConfirm({ tokenHash: "hash", type: "email", code: null, next: "/library" }, auth)).toEqual({
      to: CONFIRM_FAILED_PATH,
    });
  });

  it("refuses link types that aren't email confirmation, and unsafe next", async () => {
    const auth = fakeAuth();
    expect(await runConfirm({ tokenHash: "hash", type: "recovery", code: null, next: null }, auth)).toEqual({
      to: CONFIRM_FAILED_PATH,
    });
    expect(auth.calls).toEqual([]);
    expect(await runConfirm({ tokenHash: "hash", type: "signup", code: null, next: "//evil.com" }, auth)).toEqual({
      to: "/library",
    });
  });

  it("goes to sign-in when Supabase isn't configured", async () => {
    expect(await runConfirm({ tokenHash: "hash", type: "signup", code: null, next: null }, null)).toEqual({
      to: "/sign-in",
    });
  });
});
