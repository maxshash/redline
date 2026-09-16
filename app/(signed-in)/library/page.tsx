import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Redline: library",
};

export default function Library() {
  return (
    <section className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
      <div className="barline pb-1.5">
        <h1 className="text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
          Library
        </h1>
      </div>

      <div className="pt-7">
        <div className="hairline" />
        <h2 className="pt-4 text-[0.9375rem] font-bold uppercase leading-[1.2] tracking-[0.06em]">
          No documents yet
        </h2>
        <p className="max-w-[62ch] pt-2 text-[1rem] leading-[1.55] text-ink-soft">
          When you check a document while signed in, it&apos;s saved here with its summary and
          flags, so you can come back to it without uploading it again.
        </p>
        <Link
          href="/analyze"
          className="mt-6 inline-block border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field"
        >
          Check a document
        </Link>
      </div>
    </section>
  );
}
