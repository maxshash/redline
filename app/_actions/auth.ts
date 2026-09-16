"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  runSignIn,
  runSignOut,
  runSignUp,
  type AuthFormState,
  type AuthPort,
} from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function authPort(): Promise<AuthPort | null> {
  const supabase = await createSupabaseServerClient();
  return supabase ? supabase.auth : null;
}

async function requestOrigin(): Promise<string | null> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function credentials(formData: FormData) {
  return {
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  };
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const outcome = await runSignIn(credentials(formData), await authPort());
  if (outcome.kind === "redirect") redirect(outcome.to);
  return outcome.state;
}

export async function signUp(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const outcome = await runSignUp(credentials(formData), {
    auth: await authPort(),
    origin: await requestOrigin(),
  });
  if (outcome.kind === "redirect") redirect(outcome.to);
  return outcome.state;
}

export type SignOutState = { message: string | null };

export async function signOut(_previous: SignOutState): Promise<SignOutState> {
  const outcome = await runSignOut(await authPort());
  if (outcome.kind === "redirect") redirect(outcome.to);
  return { message: outcome.message };
}
