import type { Metadata } from "next";
import { AccountForm } from "../_components/account-form";
import { AccountPanel, bodyClass } from "../_components/account-panel";
import { AccountsUnavailable } from "../_components/accounts-unavailable";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Redline: sign in",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) return <AccountsUnavailable />;

  const params = await searchParams;
  const next = safeNextPath(first(params.next));
  const confirmFailed = first(params.confirm) === "failed";

  return (
    <AccountPanel title="Sign in">
      <p className={bodyClass}>Your library and your red lines are kept under your account.</p>
      {confirmFailed && (
        <p
          role="alert"
          className="mt-5 max-w-[60ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45] text-ink"
        >
          That confirmation link didn&apos;t work. It may have expired or already been used. Try
          signing in. If that doesn&apos;t work, sign up again for a new link.
        </p>
      )}
      <AccountForm mode="sign-in" next={next} />
    </AccountPanel>
  );
}
