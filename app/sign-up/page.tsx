import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redline: not open yet",
};

export default function SignUp() {
  return (
    <main className="flex min-h-screen items-center bg-carton px-4 py-16 sm:px-7">
      <div className="mx-auto w-full max-w-[44rem] border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
        <div className="barline pb-1.5">
          <p className="text-[1.25rem] font-extrabold uppercase leading-none tracking-[0.02em]">
            Redline
          </p>
        </div>
        <h1 className="pt-5 text-[2rem] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] sm:text-[2.75rem]">
          Not open yet
        </h1>
        <p className="max-w-[60ch] pt-3.5 text-[1rem] leading-[1.55] text-ink-soft">
          The part where you upload your own document is still being built, so
          there is nothing to sign up for today. The page you came from shows
          what it will do.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field"
        >
          Back to the panel
        </Link>
      </div>
    </main>
  );
}
