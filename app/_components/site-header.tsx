import Link from "next/link";
import type { SignedInUser } from "@/lib/supabase/server";
import { ShellNav, type Screen } from "./shell-nav";
import { SignOutButton } from "./sign-out-button";

/**
 * Who the header is for. "unavailable" is a server without Supabase: no
 * account links, since they would only lead to "accounts aren't open yet".
 */
export type HeaderAccount =
  | { kind: "signed-in"; user: SignedInUser }
  | { kind: "signed-out"; returnTo: string }
  | { kind: "unavailable" };

const CHECK: Screen = { href: "/analyze", label: "Check a document" };
const SIGNED_IN_SCREENS: readonly Screen[] = [CHECK, { href: "/library", label: "Library" }, { href: "/red-lines", label: "Red lines" }];

const narrowClass = "font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft";
const signInClass =
  "text-[0.9375rem] font-bold uppercase tracking-[0.06em] text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]";
const createAccountClass =
  "border-[3px] border-ink bg-ink px-4 py-1.5 text-[0.9375rem] font-bold uppercase tracking-[0.06em] text-panel-field transition-colors hover:bg-panel-field hover:text-ink";

/** The one header for every app screen: the same frame, with links for who is looking. */
export function SiteHeader({ account }: { account: HeaderAccount }) {
  const screens = account.kind === "signed-in" ? SIGNED_IN_SCREENS : [CHECK];
  return (
    <header className="mx-auto max-w-[86rem] px-4 pt-5 sm:px-7 sm:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-[3px] border-ink bg-panel-field px-5 pb-0 pt-4 text-ink sm:px-8">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
          <Link href={CHECK.href} className="pb-3 text-[1.25rem] font-extrabold uppercase leading-none tracking-[0.02em]">
            Redline
          </Link>
          <ShellNav screens={screens} />
        </div>
        {account.kind !== "unavailable" && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-3">
            {account.kind === "signed-in" ? (
              <>
                <p className={narrowClass}>
                  Signed in as{" "}
                  <span className="normal-case tracking-normal text-ink">{account.user.email ?? account.user.id}</span>
                </p>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href={`/sign-in?next=${encodeURIComponent(account.returnTo)}`} className={signInClass}>
                  Sign in
                </Link>
                <Link href={`/sign-up?next=${encodeURIComponent(account.returnTo)}`} className={createAccountClass}>
                  Create account
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
