import type { Metadata } from "next";
import { AccountForm } from "../_components/account-form";
import { AccountPanel, bodyClass } from "../_components/account-panel";
import { AccountsUnavailable } from "../_components/accounts-unavailable";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Redline: create an account",
};

export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) return <AccountsUnavailable />;

  const { next: rawNext } = await searchParams;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  return (
    <AccountPanel title="Create an account">
      <p className={bodyClass}>
        An account keeps the documents you check and your list of red lines. Only you can see
        them.
      </p>
      <AccountForm mode="sign-up" next={next} />
    </AccountPanel>
  );
}
