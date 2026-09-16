import Link from "next/link";
import { ContractFacts } from "./_components/contract-facts";

const TIERS = [
  {
    name: "Critical",
    rule: "h-[3px] bg-critical",
    nameClass: "text-critical",
    test: "Easy to miss and hard to undo.",
    body: "Buried in language that reads like every other paragraph, and by the time it matters the money is already gone. An auto-renewal window is the clearest case: it sits in dense boilerplate, and once it passes you owe another full term.",
  },
  {
    name: "Serious",
    rule: "h-[3px] bg-ink",
    nameClass: "text-ink",
    test: "One of the two, not both.",
    body: "Either it hides well or it costs a lot to reverse. An uncapped indemnity sits under its own heading where you will find it, which is the only reason it ranks here and not above.",
  },
  {
    name: "Worth noting",
    rule: "h-px bg-ink",
    nameClass: "text-ink",
    test: "Neither buried nor permanent.",
    body: "It still shifts something onto you, so it gets said out loud. An arbitration clause is labelled and sits where you expect it, so a careful read catches it.",
  },
];

const LIMITS = [
  {
    head: "It will not tell you whether to sign",
    body: "Redline says what the document does. Whether that is acceptable depends on the work, the client, and how much you need the job. Redline knows none of that.",
  },
  {
    head: "It is not legal advice",
    body: "No lawyer reviews your document, and nothing here is a substitute for one on a deal you cannot afford to get wrong.",
  },
  {
    head: "A scan or a photo will not work",
    body: "Redline needs text it can pull out of the file. Misreading a sentence and then quoting it back to you would make every citation on the page worthless.",
  },
  {
    head: "Your file stays on your machine",
    body: "The document is opened and read in your browser. Only the extracted text is saved, never the file you picked.",
  },
];

export default function Home() {
  return (
    <main className="bg-carton text-carton-ink">
      {/* ============ The demonstration ============ */}
      <section className="mx-auto max-w-[86rem] px-4 pb-16 pt-5 sm:px-7 sm:pb-24 sm:pt-7">
        <ContractFacts />
      </section>

      {/* ============ How severity is set ============ */}
      <section className="mx-auto max-w-[86rem] px-4 pb-16 sm:px-7 sm:pb-24">
        <div className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
          <div className="barline pb-1.5">
            <h2 className="text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
              How a warning gets its weight
            </h2>
          </div>
          <p className="max-w-[68ch] pt-3.5 text-[1rem] leading-[1.55] text-ink-soft">
            Two questions decide the tier, and neither is how big the number
            is. How easily would a careful person reading at normal speed go
            past this? And once it has happened, how hard is it to walk back?
            A clause with a terrifying dollar figure printed under its own
            heading is less dangerous than a quiet renewal date, because you
            will see the first one.
          </p>

          <ul className="pt-7">
            {TIERS.map((tier) => (
              <li key={tier.name} className="pt-6 first:pt-0">
                <div className={tier.rule} />
                <div className="grid gap-x-8 gap-y-1.5 pt-3 sm:grid-cols-[minmax(0,13rem)_1fr]">
                  <div>
                    <p
                      className={`text-[1.0625rem] font-extrabold uppercase tracking-[0.05em] ${tier.nameClass}`}
                    >
                      {tier.name}
                    </p>
                    <p className="font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
                      {tier.test}
                    </p>
                  </div>
                  <p className="max-w-[62ch] text-[0.9375rem] leading-[1.55] text-ink-soft">
                    {tier.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 barline-thin" />
          <div className="grid gap-x-8 gap-y-4 pt-5 sm:grid-cols-2">
            <div>
              <h3 className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">
                There is no score
              </h3>
              <p className="max-w-[52ch] pt-1.5 text-[0.9375rem] leading-[1.55] text-ink-soft">
                Three named tiers, no number. Nobody can defend why a clause is
                a 7 and not a 6, and a number would suggest somebody could.
              </p>
            </div>
            <div>
              <h3 className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">
                Nothing found is a real answer
              </h3>
              <p className="max-w-[52ch] pt-1.5 text-[0.9375rem] leading-[1.55] text-ink-soft">
                Plenty of agreements are ordinary. When one is, Redline says so
                and stops, rather than reaching for something to worry you
                with so the review feels worth it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ The citation guarantee ============ */}
      <section className="mx-auto max-w-[86rem] px-4 pb-16 sm:px-7 sm:pb-24">
        <div className="border-y-[3px] border-carton-ink-soft py-12 sm:py-16">
          <h2 className="max-w-[26ch] text-[1.875rem] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] sm:text-[2.25rem]">
            A warning with no sentence under it is a bug
          </h2>
          <p className="max-w-[62ch] pt-5 text-[1.0625rem] leading-[1.55] text-carton-ink-soft">
            Redline cannot raise a concern it is unable to point at, so
            anything it only has a feeling about never reaches you. You do not
            have to trust the judgement. Open the document, find the words, and
            decide for yourself whether they say what the warning claims.
          </p>
          <p className="max-w-[62ch] pt-4 text-[1.0625rem] leading-[1.55] text-carton-ink-soft">
            The same rule holds the question box: ask it anything about your
            document and it answers from that text alone, or tells you the
            document does not say.
          </p>
        </div>
      </section>

      {/* ============ Red lines ============ */}
      <section className="mx-auto max-w-[86rem] px-4 pb-16 sm:px-7 sm:pb-24">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-5">
          <div className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink lg:col-span-7 sm:px-8 sm:py-8">
            <div className="barline pb-1.5">
              <h2 className="text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
                Your own red lines
              </h2>
            </div>
            <p className="max-w-[64ch] pt-3.5 text-[1rem] leading-[1.55] text-ink-soft">
              Keep a list of what you will not accept: net 60, anything
              touching work you already owned, a non-compete of any length.
              Redline checks every document against it and reports what it
              hits, whether or not the clause was going to be flagged on its
              own merits. In the panel above, the sixty-day payment terms carry
              no tier at all. They are there because the list asked for them.
            </p>
            <p className="max-w-[64ch] pt-3.5 text-[1rem] leading-[1.55] text-ink-soft">
              A match is stamped on afterwards, in its own ink. It never
              borrows a severity rule and it never changes one, because the two
              answer different questions: how dangerous is this, and did you
              ask me to watch for it.
            </p>
          </div>

          <div className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink lg:col-span-5 sm:px-8 sm:py-8">
            <p className="font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
              On the list
            </p>
            <ul className="pt-3">
              {[
                "Nothing longer than net 30.",
                "Never assign anything I built before the project.",
                "No non-compete, no matter how short.",
                "Kill fee on any project cancelled after kickoff.",
              ].map((line) => (
                <li
                  key={line}
                  className="hairline flex gap-3 py-2.5 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.45rem] h-2 w-2 shrink-0 bg-overprint"
                  />
                  <span className="overprint-stamp text-[0.8125rem] leading-[1.45]">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
            <p className="pt-3 text-[0.9375rem] leading-[1.55] text-ink-soft">
              Yours to edit, and carried across every document you upload.
            </p>
          </div>
        </div>
      </section>

      {/* ============ What it will not do ============ */}
      <section className="mx-auto max-w-[86rem] px-4 pb-16 sm:px-7 sm:pb-24">
        <div className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
          <div className="barline pb-1.5">
            <h2 className="text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
              What it will not do
            </h2>
          </div>
          <ul className="grid gap-x-10 gap-y-6 pt-6 sm:grid-cols-2">
            {LIMITS.map((limit) => (
              <li key={limit.head}>
                <div className="rule-noted flex gap-3 pt-3">
                  <span
                    aria-hidden="true"
                    className="mt-[0.5rem] h-2.5 w-2.5 shrink-0 bg-ink"
                  />
                  <div>
                    <h3 className="text-[1rem] font-bold uppercase tracking-[0.04em]">
                      {limit.head}
                    </h3>
                    <p className="max-w-[48ch] pt-1.5 text-[0.9375rem] leading-[1.55] text-ink-soft">
                      {limit.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ The close ============ */}
      <section className="bg-carton-deep">
        <div className="mx-auto flex max-w-[86rem] flex-col items-start gap-6 px-4 py-14 sm:px-7 sm:py-20">
          <h2 className="max-w-[20ch] text-[1.875rem] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] sm:text-[2.375rem]">
            Put your own contract through it
          </h2>
          <p className="max-w-[56ch] text-[1.0625rem] leading-[1.55] text-carton-ink-soft">
            Freelance and consulting agreements are what this version is tuned
            for. Leases and terms of service go through the same read, against
            the same defaults.
          </p>
          <Link
            href="/sign-up"
            className="border-[3px] border-carton-ink bg-carton-ink px-7 py-3.5 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-deep transition-colors hover:bg-carton-deep hover:text-carton-ink"
          >
            Try it on a document
          </Link>
        </div>
      </section>

      <footer className="bg-carton-deep">
        <div className="mx-auto max-w-[86rem] border-t border-carton-ink-soft/40 px-4 py-6 sm:px-7">
          <p className="font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-carton-ink-soft">
            Redline · The agreement shown on this page is invented, and so is
            every clause in it
          </p>
        </div>
      </footer>
    </main>
  );
}
