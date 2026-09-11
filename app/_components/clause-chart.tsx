import { Stamp } from "./stamp";

const ELEMENTS = [
  {
    number: "§1",
    label: "Automatic renewal, notice window",
    tier: "critical" as const,
    quote:
      "This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the end of the then-current term.",
    rationale:
      "Easy to miss inside routine renewal language. Once the window closes, the next full year is likely locked in.",
  },
  {
    number: "§2",
    label: "Assignment of work product",
    tier: "serious" as const,
    quote:
      "Contractor hereby assigns to Client all right, title, and interest in and to any pre-existing tools, methods, or materials incorporated into the Deliverables.",
    rationale:
      "Reaches beyond the deliverable into tools built before this engagement. Probably hard to undo once signed.",
  },
  {
    number: "§3",
    label: "Governing law",
    tier: "cleared" as const,
    quote:
      "This Agreement shall be governed by the laws of the State of Delaware, without regard to conflict-of-law principles.",
    rationale:
      "Standard governing-law language. Doesn't shift risk, cost, or control onto either party.",
  },
];

export function ClauseChart() {
  return (
    <div className="border-[3px] border-ink bg-paper-dim">
      <div className="flex flex-col gap-1 border-b-[3px] border-ink bg-ink px-5 py-3 font-[family-name:var(--font-typewriter)] text-paper sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.2em]">
          Example agreement — Section 4, Freelance Services
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-paper-dim">
          Illustrative, not a real client file
        </span>
      </div>

      <ol className="divide-y-[3px] divide-rule">
        {ELEMENTS.map((el, i) => (
          <li key={el.number} className="grid gap-4 p-5 sm:grid-cols-[minmax(0,9rem)_1fr] sm:p-6">
            <div className="flex flex-row items-start gap-2 sm:flex-col sm:gap-1">
              <span className="font-[family-name:var(--font-typewriter)] text-sm font-bold tabular-nums text-ink-soft">
                {el.number}
              </span>
              <span className="text-sm text-ink-soft">{el.label}</span>
            </div>

            <div className="flex flex-col gap-3">
              <Stamp tier={el.tier} delayMs={i * 140} />
              <p className="font-[family-name:var(--font-document)] text-xl italic leading-snug text-ink sm:text-2xl">
                “{el.quote}”
              </p>
              <p className="text-sm text-ink-soft">{el.rationale}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t-[3px] border-ink bg-ink px-5 py-3 font-[family-name:var(--font-typewriter)] text-paper">
        <span className="text-xs uppercase tracking-[0.2em] text-paper-dim">
          Elements examined
        </span>
        <span className="text-sm font-bold tabular-nums tracking-[0.1em]">
          3 examined · 2 flagged · 1 cleared
        </span>
      </div>
    </div>
  );
}
