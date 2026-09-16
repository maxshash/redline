import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSignedInUser } from "@/lib/supabase/server";
import { AnalyzeWorkspace, type Keeping } from "./_components/analyze-workspace";

export const metadata: Metadata = {
  title: "Redline: check a document",
};

const mastheadLinkClass =
  "font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]";

/**
 * Where a document comes in. Public: no account and no Supabase needed to
 * read a document. Keeping it in the library needs an account.
 */
export default async function Analyze() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getSignedInUser() : null;
  const keeping: Keeping = !configured ? "unavailable" : user ? "signed-in" : "signed-out";

  return (
    <div className="min-h-screen bg-carton text-carton-ink">
      <header className="mx-auto max-w-[86rem] px-4 pt-5 sm:px-7 sm:pt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-[3px] border-ink bg-panel-field px-5 py-3.5 text-ink sm:px-8">
          <Link href="/" className="text-[1.25rem] font-extrabold uppercase leading-none tracking-[0.02em]">
            Redline
          </Link>
          {keeping === "signed-in" && (
            <Link href="/library" className={mastheadLinkClass}>
              Your library
            </Link>
          )}
          {keeping === "signed-out" && (
            <Link href="/sign-in?next=%2Fanalyze" className={mastheadLinkClass}>
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[86rem] px-4 pb-16 pt-5 sm:px-7 sm:pb-24">
        <AnalyzeWorkspace keeping={keeping} />
      </main>
    </div>
  );
}
