import Link from "next/link";
import { AccountPanel, bodyClass, primaryButtonClass, textLinkClass } from "./account-panel";

/** Shown on sign-in and sign-up when Supabase isn't configured. */
export function AccountsUnavailable() {
  return (
    <AccountPanel title="Accounts aren't open yet">
      <p className={bodyClass}>
        Accounts aren&apos;t switched on for this copy of Redline yet, so you
        can&apos;t sign up or sign in. You don&apos;t need an account to check a
        document. You&apos;ll need one later to save documents and keep a list
        of red lines.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-6">
        <Link href="/analyze" className={primaryButtonClass}>
          Check a document without an account
        </Link>
        <Link href="/" className={`text-[0.9375rem] ${textLinkClass}`}>
          Back to the panel
        </Link>
      </div>
    </AccountPanel>
  );
}
