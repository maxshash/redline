import { DEFAULT_SIGNED_IN_PATH, safeNextPath } from "./safe-redirect";

/**
 * The slice of `supabase.auth` the account actions use. The real client
 * satisfies it; tests pass a fake at this boundary so the actions' own logic
 * (validation, error wording, redirects, the confirm-email branch) is what
 * gets exercised.
 */
export interface AuthErrorLike {
  message: string;
  code?: string;
  status?: number;
  name?: string;
}

export interface AuthPort {
  signInWithPassword(credentials: { email: string; password: string }): Promise<{
    error: AuthErrorLike | null;
  }>;
  signUp(credentials: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string };
  }): Promise<{
    data: { session: unknown | null; user: unknown | null };
    error: AuthErrorLike | null;
  }>;
  signOut(): Promise<{ error: AuthErrorLike | null }>;
  verifyOtp(params: { type: "signup" | "email"; token_hash: string }): Promise<{
    error: AuthErrorLike | null;
  }>;
  exchangeCodeForSession(code: string): Promise<{ error: AuthErrorLike | null }>;
}

export type AuthFormState =
  | { status: "idle" }
  | { status: "unavailable" }
  | { status: "error"; message: string; email: string }
  | { status: "check-email"; email: string };

export type AuthOutcome =
  | { kind: "redirect"; to: string }
  | { kind: "state"; state: AuthFormState };

export const MIN_PASSWORD_LENGTH = 8;

export const AUTH_COPY = {
  missingEmail: "Enter your email address.",
  invalidEmail: "That email address doesn't look right. Check it for typos.",
  missingPassword: "Enter your password.",
  shortPassword: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
  invalidCredentials: "That email and password don't match an account.",
  emailNotConfirmed:
    "You haven't confirmed this email address yet. Open the link in the email we sent when you signed up, then sign in.",
  accountExists: "There's already an account with this email. Sign in instead.",
  weakPassword: "That password is too easy to guess. Try a longer one.",
  rateLimited: "Too many attempts in a short time. Wait a few minutes and try again.",
  signupsClosed: "New accounts can't be created right now.",
  unreachable: "Couldn't reach the account service. Check your connection and try again.",
  unexpected: "Something went wrong. Try again in a minute.",
  signOutFailed: "Couldn't sign you out. Try again.",
} as const;

/** Turn an auth error into a sentence a person can act on. */
export function describeAuthError(error: AuthErrorLike): string {
  switch (error.code) {
    case "invalid_credentials":
      return AUTH_COPY.invalidCredentials;
    case "email_not_confirmed":
      return AUTH_COPY.emailNotConfirmed;
    case "user_already_exists":
    case "email_exists":
      return AUTH_COPY.accountExists;
    case "weak_password":
      return AUTH_COPY.weakPassword;
    case "email_address_invalid":
      return AUTH_COPY.invalidEmail;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return AUTH_COPY.rateLimited;
    case "signup_disabled":
    case "email_provider_disabled":
      return AUTH_COPY.signupsClosed;
  }
  // supabase-js reports a failed fetch as AuthRetryableFetchError, status 0.
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return AUTH_COPY.unreachable;
  }
  if (error.status === 429) return AUTH_COPY.rateLimited;
  return AUTH_COPY.unexpected;
}

export interface CredentialsInput {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
  next: FormDataEntryValue | null;
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorState(message: string, email: string): AuthOutcome {
  return { kind: "state", state: { status: "error", message, email } };
}

/** Validation shared by both forms; returns an error outcome or the clean values. */
function readCredentials(
  input: CredentialsInput,
  mode: "sign-in" | "sign-up",
): { email: string; password: string } | AuthOutcome {
  const email = text(input.email).trim();
  const password = text(input.password);
  if (!email) return errorState(AUTH_COPY.missingEmail, email);
  if (!EMAIL_SHAPE.test(email)) return errorState(AUTH_COPY.invalidEmail, email);
  if (!password) return errorState(AUTH_COPY.missingPassword, email);
  if (mode === "sign-up" && password.length < MIN_PASSWORD_LENGTH) {
    return errorState(AUTH_COPY.shortPassword, email);
  }
  return { email, password };
}

const UNAVAILABLE: AuthOutcome = { kind: "state", state: { status: "unavailable" } };

/**
 * Sign in with email and password. `auth` is null when Supabase isn't
 * configured, which is reported as unavailable rather than faked.
 */
export async function runSignIn(input: CredentialsInput, auth: AuthPort | null): Promise<AuthOutcome> {
  if (!auth) return UNAVAILABLE;
  const credentials = readCredentials(input, "sign-in");
  if ("kind" in credentials) return credentials;

  const { error } = await auth.signInWithPassword(credentials);
  if (error) return errorState(describeAuthError(error), credentials.email);
  return { kind: "redirect", to: safeNextPath(text(input.next)) };
}

export interface SignUpDeps {
  auth: AuthPort | null;
  /** The site origin, e.g. "https://redline.example", for the confirmation link. */
  origin: string | null;
}

/** Where the confirmation email's link should land. */
export function confirmationRedirectUrl(origin: string, next: string): string {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("next", next);
  return url.toString();
}

/**
 * Create an account. If the project requires email confirmation Supabase
 * returns no session, and the person is told to check their inbox; otherwise
 * they are signed in and sent on.
 */
export async function runSignUp(input: CredentialsInput, deps: SignUpDeps): Promise<AuthOutcome> {
  if (!deps.auth) return UNAVAILABLE;
  const credentials = readCredentials(input, "sign-up");
  if ("kind" in credentials) return credentials;

  const next = safeNextPath(text(input.next));
  const { data, error } = await deps.auth.signUp({
    ...credentials,
    options: deps.origin ? { emailRedirectTo: confirmationRedirectUrl(deps.origin, next) } : undefined,
  });
  if (error) return errorState(describeAuthError(error), credentials.email);

  if (!data.session) {
    return { kind: "state", state: { status: "check-email", email: credentials.email } };
  }
  return { kind: "redirect", to: next };
}

export type SignOutOutcome = { kind: "redirect"; to: string } | { kind: "error"; message: string };

/** Clear the session and send the person to the landing page. */
export async function runSignOut(auth: AuthPort | null): Promise<SignOutOutcome> {
  // With no Supabase there is no session to clear.
  if (!auth) return { kind: "redirect", to: "/" };
  const { error } = await auth.signOut();
  if (error) return { kind: "error", message: AUTH_COPY.signOutFailed };
  return { kind: "redirect", to: "/" };
}

export const CONFIRM_FAILED_PATH = "/sign-in?confirm=failed";

export interface ConfirmInput {
  tokenHash: string | null;
  type: string | null;
  code: string | null;
  next: string | null;
}

const EMAIL_CONFIRM_TYPES = new Set(["signup", "email"]);

/**
 * Handle the link in a confirmation email. Supports both link shapes
 * Supabase can send: `token_hash` + `type` (the SSR guide's email template)
 * and `code` (the default template under the PKCE flow).
 */
export async function runConfirm(input: ConfirmInput, auth: AuthPort | null): Promise<{ to: string }> {
  if (!auth) return { to: "/sign-in" };
  const next = safeNextPath(input.next, DEFAULT_SIGNED_IN_PATH);

  if (input.tokenHash && input.type && EMAIL_CONFIRM_TYPES.has(input.type)) {
    const { error } = await auth.verifyOtp({
      type: input.type as "signup" | "email",
      token_hash: input.tokenHash,
    });
    return { to: error ? CONFIRM_FAILED_PATH : next };
  }

  if (input.code) {
    const { error } = await auth.exchangeCodeForSession(input.code);
    return { to: error ? CONFIRM_FAILED_PATH : next };
  }

  return { to: CONFIRM_FAILED_PATH };
}
