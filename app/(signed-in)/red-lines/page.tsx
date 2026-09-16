import type { Metadata } from "next";
import { RED_LINE_COPY, RED_LINES_MAX_COUNT } from "@/lib/red-lines/red-lines";
import { supabaseRedLineStore } from "@/lib/red-lines/supabase";
import { createSupabaseServerClient, getSignedInUser } from "@/lib/supabase/server";
import { RedLineList } from "./_components/red-line-list";

export const metadata: Metadata = {
  title: "Redline: red lines",
};

const alertClass = "max-w-[60ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45] text-ink";

export default async function RedLines() {
  // The signed-in layout has already sent anyone without a session to sign-in.
  const [supabase, user] = await Promise.all([createSupabaseServerClient(), getSignedInUser()]);
  const redLines = supabase && user ? await supabaseRedLineStore(supabase).listForUser(user.id) : null;

  return (
    <section className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
      <div className="barline flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-1.5">
        <h1 className="text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
          Your red lines
        </h1>
        {redLines && redLines.length > 0 && (
          <p className="tabular font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
            {redLines.length} of {RED_LINES_MAX_COUNT}
          </p>
        )}
      </div>

      {!supabase && (
        <div className="pt-7">
          <p role="alert" className={alertClass}>
            {RED_LINE_COPY.unavailable}
          </p>
        </div>
      )}

      {supabase && redLines === null && (
        <div className="pt-7">
          <p role="alert" className={alertClass}>
            {RED_LINE_COPY.loadFailed}
          </p>
        </div>
      )}

      {redLines && <RedLineList redLines={redLines} />}
    </section>
  );
}
