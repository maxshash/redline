import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSignedInUser } from "@/lib/supabase/server";
import { SiteHeader, type HeaderAccount } from "@/app/_components/site-header";
import { AnalyzeWorkspace, type Keeping } from "./_components/analyze-workspace";

/** Analysis runs in a server action on this page, and a model call can take a while. */
export const maxDuration = 120;

export const metadata: Metadata = {
  title: "Redline: check a document",
};

/**
 * Where a document comes in. Public: no account and no Supabase needed to
 * read a document. Keeping it in the library needs an account.
 */
export default async function Analyze() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getSignedInUser() : null;
  const keeping: Keeping = !configured ? "unavailable" : user ? "signed-in" : "signed-out";
  const account: HeaderAccount = !configured
    ? { kind: "unavailable" }
    : user
      ? { kind: "signed-in", user }
      : { kind: "signed-out", returnTo: "/analyze" };

  return (
    <div className="min-h-screen bg-carton text-carton-ink">
      <SiteHeader account={account} />
      <main className="mx-auto max-w-[86rem] px-4 pb-16 pt-5 sm:px-7 sm:pb-24">
        <AnalyzeWorkspace keeping={keeping} />
      </main>
    </div>
  );
}
