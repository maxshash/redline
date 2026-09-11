import { ClauseChart } from "./_components/clause-chart";
import { Stamp } from "./_components/stamp";

const TIERS = [
  {
    tier: "critical" as const,
    name: "Critical",
    definition:
      "Easy to miss and hard to undo once it's triggered. The auto-renewal clause above is the archetype.",
  },
  {
    tier: "serious" as const,
    name: "Serious",
    definition:
      "Easy to miss, or hard to undo — not both. Broad IP assignment, uncapped indemnification, restrictive non-competes.",
  },
  {
    tier: "noting" as const,
    name: "Worth noting",
    definition:
      "Shifts something onto you, but it's neither buried nor irreversible. Arbitration clauses, fee escalators.",
  },
];

const BOUNDARIES = [
  "No verdict on whether to sign. You decide; Redline shows you what's there.",
  "No legal advice. Every flag is grounded in your document's own text, not a lawyer's judgment.",
  "No scanned or photographed documents. Text is extracted from the file in your browser, because a citation is worthless if the text it points to was misread.",
  "Tuned for freelance and consulting agreements. Leases and terms of service are accepted, but analyzed against the same defaults, not a set built for them.",
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 sm:px-8">
      <header className="flex items-center justify-between border-b-[3px] border-ink py-6">
        <span className="font-[family-name:var(--font-typewriter)] text-lg font-bold tracking-[0.14em]">
          REDLINE
        </span>
        <a
          href="#try-it"
          className="font-[family-name:var(--font-typewriter)] text-xs font-bold uppercase tracking-[0.18em] text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink"
        >
          Try it on a document
        </a>
      </header>

      <main className="flex flex-1 flex-col gap-24 py-16 sm:gap-32 sm:py-24">
        <section className="flex flex-col gap-10">
          <div className="flex max-w-3xl flex-col gap-5">
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl md:text-6xl">
              Every flag points to the exact sentence that caused it.
            </h1>
            <p className="max-w-[68ch] text-lg leading-relaxed text-ink-soft sm:text-xl">
              Upload a contract, lease, freelance agreement, or ToS. Redline
              finds the clauses that shift risk, cost, or control onto you,
              ranks each one, and shows you exactly where in the document it
              came from, so you can check it against the text yourself
              instead of trusting a summary.
            </p>
          </div>

          <ClauseChart />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              id="try-it"
              href="/sign-up"
              className="inline-flex w-fit items-center justify-center border-[3px] border-ink bg-ink px-7 py-3.5 font-[family-name:var(--font-typewriter)] text-sm font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-paper hover:text-ink"
            >
              Try it on a document
            </a>
            <span className="text-sm text-ink-soft">
              No card required to try it.
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <h2 className="max-w-[42ch] text-2xl font-semibold tracking-[-0.01em] sm:text-3xl">
            Three tiers, not a numeric score.
          </h2>

          <ul className="divide-y-[3px] divide-rule border-y-[3px] border-rule">
            {TIERS.map((t) => (
              <li
                key={t.name}
                className="grid grid-cols-1 items-start gap-3 py-6 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-8"
              >
                <Stamp tier={t.tier} />
                <p className="max-w-[68ch] text-base leading-relaxed text-ink-soft sm:text-lg">
                  {t.definition}
                </p>
              </li>
            ))}
          </ul>

          <p className="max-w-[68ch] text-sm text-ink-soft">
            Tiers are ranked by how easy a clause is to miss and how hard its
            consequence is to undo, not by dollar exposure. A document with
            none of these is a valid result, not a failure.
          </p>
        </section>

        <section className="flex flex-col gap-8">
          <h2 className="max-w-[42ch] text-2xl font-semibold tracking-[-0.01em] sm:text-3xl">
            What this doesn&rsquo;t do
          </h2>
          <ul className="flex flex-col gap-5">
            {BOUNDARIES.map((line) => (
              <li
                key={line}
                className="grid grid-cols-[1.5rem_1fr] items-baseline gap-3 border-b border-rule pb-5 last:border-b-0"
              >
                <span
                  aria-hidden
                  className="font-[family-name:var(--font-typewriter)] text-ink-soft"
                >
                  —
                </span>
                <p className="max-w-[68ch] text-base leading-relaxed text-ink-soft sm:text-lg">
                  {line}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col items-start gap-6 border-[3px] border-ink bg-paper-dim p-8 sm:p-12">
          <h2 className="max-w-[36ch] text-2xl font-semibold tracking-[-0.01em] sm:text-3xl">
            Read the document before you sign it.
          </h2>
          <p className="max-w-[68ch] text-base leading-relaxed text-ink-soft sm:text-lg">
            Only the text you upload is ever stored. The original file
            never is. Your library stays private to you.
          </p>
          <a
            href="/sign-up"
            className="inline-flex w-fit items-center justify-center border-[3px] border-ink bg-ink px-7 py-3.5 font-[family-name:var(--font-typewriter)] text-sm font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            Try it on a document
          </a>
        </section>
      </main>

      <footer className="flex flex-col gap-2 border-t-[3px] border-ink py-8 text-xs text-ink-soft">
        <span className="font-[family-name:var(--font-typewriter)] font-bold tracking-[0.14em] text-ink-soft">
          REDLINE
        </span>
        <p className="max-w-[68ch]">
          Redline flags what a document says. It doesn&rsquo;t tell you
          whether to sign, and it isn&rsquo;t legal advice.
        </p>
      </footer>
    </div>
  );
}
