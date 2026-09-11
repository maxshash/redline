import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redline — not live yet",
};

export default function SignUp() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 px-5 sm:px-8">
      <span className="font-[family-name:var(--font-typewriter)] text-lg font-bold tracking-[0.14em]">
        REDLINE
      </span>
      <h1 className="text-3xl font-semibold tracking-[-0.01em] sm:text-4xl">
        Sign-up isn&rsquo;t live yet.
      </h1>
      <p className="max-w-[60ch] text-lg leading-relaxed text-ink-soft">
        The upload-and-review app is still being built. Check back soon, or
        head back to see how the analysis works.
      </p>
      <Link
        href="/"
        className="inline-flex w-fit items-center justify-center border-[3px] border-ink bg-ink px-7 py-3.5 font-[family-name:var(--font-typewriter)] text-sm font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-paper hover:text-ink"
      >
        Back to Redline
      </Link>
    </div>
  );
}
