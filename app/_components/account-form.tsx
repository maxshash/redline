"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/_actions/auth";
import { MIN_PASSWORD_LENGTH, type AuthFormState } from "@/lib/auth/actions";
import { bodyClass, primaryButtonClass, textLinkClass } from "./account-panel";

const labelClass =
  "block font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft";

const inputClass =
  "mt-1.5 block w-full border-[3px] border-ink bg-panel-field px-3 py-2.5 text-[1rem] text-ink";

const MODES = {
  "sign-in": {
    action: signIn,
    submit: "Sign in",
    pending: "Signing in…",
    passwordAutocomplete: "current-password",
    switchPrompt: "No account yet?",
    switchLabel: "Create one",
    switchPath: "/sign-up",
  },
  "sign-up": {
    action: signUp,
    submit: "Create account",
    pending: "Creating account…",
    passwordAutocomplete: "new-password",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchPath: "/sign-in",
  },
} as const;

export function AccountForm({ mode, next }: { mode: "sign-in" | "sign-up"; next: string }) {
  const config = MODES[mode];
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(config.action, {
    status: "idle",
  });

  if (state.status === "check-email") {
    return (
      <div className="pt-6">
        <div className="barline-thin pb-1.5">
          <h2 className="text-[0.9375rem] font-bold uppercase leading-[1.2] tracking-[0.06em]">
            Check your email
          </h2>
        </div>
        <p className={bodyClass} role="status">
          We sent a link to <strong className="font-bold text-ink">{state.email}</strong>. Open
          it to confirm the address and you&apos;ll be signed in.
        </p>
        <p className={bodyClass}>
          If you already have an account with this address, no email is coming.{" "}
          <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className={textLinkClass}>
            Sign in
          </Link>{" "}
          instead.
        </p>
      </div>
    );
  }

  if (state.status === "unavailable") {
    // Supabase went away between rendering the page and submitting. Rare, but say so.
    return (
      <p className={bodyClass} role="alert">
        Accounts aren&apos;t switched on for this copy of Redline yet, so you can&apos;t sign up or
        sign in.
      </p>
    );
  }

  const email = state.status === "error" ? state.email : "";
  const switchHref = `${config.switchPath}?next=${encodeURIComponent(next)}`;

  return (
    <form action={formAction} className="pt-6" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.status === "error" && (
        <p
          role="alert"
          className="mb-5 max-w-[60ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45] text-ink"
        >
          {state.message}
        </p>
      )}

      <div className="max-w-[28rem] space-y-5">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={email}
            key={email}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={config.passwordAutocomplete}
            required
            minLength={mode === "sign-up" ? MIN_PASSWORD_LENGTH : undefined}
            aria-describedby={mode === "sign-up" ? "password-hint" : undefined}
            className={inputClass}
          />
          {mode === "sign-up" && (
            <p id="password-hint" className="pt-1.5 text-[0.9375rem] leading-[1.55] text-ink-soft">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          )}
        </div>
      </div>

      <div className="hairline mt-7" />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-5">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? config.pending : config.submit}
        </button>
        <p className="text-[0.9375rem] text-ink-soft">
          {config.switchPrompt}{" "}
          <Link href={switchHref} className={textLinkClass}>
            {config.switchLabel}
          </Link>
        </p>
      </div>
    </form>
  );
}
