import type { Metadata } from "next";
import Link from "next/link";
import { supabaseDocumentStore } from "@/lib/documents/supabase";
import { createSupabaseServerClient, getSignedInUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Redline: library",
};

const buttonClass =
  "inline-block border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function Library() {
  // The signed-in layout has already sent anyone without a session to sign-in.
  const [supabase, user] = await Promise.all([createSupabaseServerClient(), getSignedInUser()]);
  const documents = supabase && user ? await supabaseDocumentStore(supabase).listForUser(user.id) : [];

  return (
    <section className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
      <div className="barline flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-1.5">
        <h1 className="text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
          Library
        </h1>
        {documents && documents.length > 0 && (
          <p className="tabular font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </p>
        )}
      </div>

      {documents === null && (
        <div className="pt-7">
          <p
            role="alert"
            className="max-w-[60ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45] text-ink"
          >
            Couldn&apos;t load your documents. Refresh the page to try again.
          </p>
        </div>
      )}

      {documents && documents.length === 0 && (
        <div className="pt-7">
          <div className="hairline" />
          <h2 className="pt-4 text-[0.9375rem] font-bold uppercase leading-[1.2] tracking-[0.06em]">
            No documents yet
          </h2>
          <p className="max-w-[62ch] pt-2 text-[1rem] leading-[1.55] text-ink-soft">
            Documents you save while signed in show up here. Check a document, then choose Save to
            keep it.
          </p>
          <Link href="/analyze" className={`mt-6 ${buttonClass}`}>
            Check a document
          </Link>
        </div>
      )}

      {documents && documents.length > 0 && (
        <>
          <ul className="pt-5">
            {documents.map((document) => (
              <li
                key={document.id}
                className="hairline flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5 first:border-t first:border-ink"
              >
                <p className="min-w-0 max-w-[60ch] break-words text-[1rem] font-bold leading-[1.35]">
                  {document.title}
                </p>
                <time
                  dateTime={document.createdAt}
                  className="tabular shrink-0 font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft"
                >
                  {dateFormat.format(new Date(document.createdAt))}
                </time>
              </li>
            ))}
          </ul>
          <Link href="/analyze" className={`mt-7 ${buttonClass}`}>
            Check another document
          </Link>
        </>
      )}
    </section>
  );
}
