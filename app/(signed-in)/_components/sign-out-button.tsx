"use client";

import { useActionState } from "react";
import { signOut, type SignOutState } from "@/app/_actions/auth";

export function SignOutButton() {
  const [state, formAction, pending] = useActionState<SignOutState>(signOut, { message: null });
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {state.message && (
        <p role="alert" className="text-[0.9375rem] font-bold text-ink">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="border-[3px] border-ink bg-panel-field px-4 py-1.5 text-[0.9375rem] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:bg-ink hover:text-panel-field disabled:cursor-wait"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </form>
  );
}
