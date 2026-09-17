import Link from "next/link";
import { LIBRARY_COPY } from "@/lib/library/copy";

/**
 * The same page for an id that doesn't exist and one that belongs to someone
 * else: row-level security returns nothing either way, and so does this.
 */
export default function SavedDocumentNotFound() {
  return (
    <section className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
      <div className="barline pb-1.5">
        <h1 className="text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
          Not found
        </h1>
      </div>
      <p className="max-w-[62ch] pt-4 text-[1rem] leading-[1.55] text-ink-soft">{LIBRARY_COPY.notFound}</p>
      <Link
        href="/library"
        className="mt-6 inline-block border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field"
      >
        Back to your library
      </Link>
    </section>
  );
}
