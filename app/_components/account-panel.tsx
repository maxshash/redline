import Link from "next/link";

/**
 * The printed panel every account page sits in: wordmark over the barline,
 * then the page's own heading and content.
 */
export function AccountPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center bg-carton px-4 py-16 sm:px-7">
      <div className="mx-auto w-full max-w-[44rem] border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
        <div className="barline pb-1.5">
          <Link
            href="/"
            className="text-[1.25rem] font-extrabold uppercase leading-none tracking-[0.02em]"
          >
            Redline
          </Link>
        </div>
        <h1 className="pt-5 text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}

export const primaryButtonClass =
  "inline-block border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field disabled:cursor-wait disabled:bg-ink disabled:text-panel-field";

export const bodyClass = "max-w-[60ch] pt-3.5 text-[1rem] leading-[1.55] text-ink-soft";

export const textLinkClass =
  "font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]";
