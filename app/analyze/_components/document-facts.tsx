"use client";

import { useEffect, useState } from "react";
import { AXIS_LABEL, TIER_LABEL, clauseLabel } from "@/lib/analysis/labels";
import type { Analysis, CounterOffer, Flag, FlagWithCounterOffer, SeverityTier } from "@/lib/analysis/types";

/** What the page knows about the analysis of the document in hand. */
export type AnalysisRun =
  | { status: "idle" }
  | { status: "running" }
  | { status: "failed"; message: string }
  | { status: "done"; analysis: Analysis };

/** Severity is rule weight; Critical is the only tier with colour (DESIGN.md). */
const TIER_RULE: Record<SeverityTier, string> = {
  critical: "rule-critical",
  serious: "rule-serious",
  "worth-noting": "rule-noted",
};

/** Real scale difference does the ranking. */
const TIER_QUOTE: Record<SeverityTier, string> = {
  critical: "text-[1.75rem] leading-[1.2] sm:text-[2.75rem] sm:leading-[1.14]",
  serious: "text-[1.125rem] leading-[1.35] sm:text-[1.375rem]",
  "worth-noting": "text-[1rem] leading-[1.45] sm:text-[1.0625rem]",
};

const labelClass = "text-[0.9375rem] font-bold uppercase tracking-[0.06em]";
const narrowClass = "font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft";
const bodyClass = "max-w-[62ch] pt-1.5 text-[1rem] leading-[1.55] text-ink-soft";
const buttonClass =
  "inline-block cursor-pointer border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field disabled:cursor-wait disabled:bg-ink disabled:text-panel-field";

export const FACTS_COPY = {
  intro:
    "Redline reads the extracted text, writes a short summary and lists the clauses that could cost you. Each warning quotes the document word for word.",
  start: "Check this document",
  running: "Reading the document…",
  runningDetail: "This can take a minute. Keep this tab open.",
  retry: "Try again",
  summaryHeading: "What this document does",
  warningsHeading: "Warnings",
  selectHint: "Select a warning to see where it is in the document.",
  cleanHeading: "Nothing critical or serious",
  cleanBody:
    "Redline checked this document for automatic renewal, one-sided termination, broad IP assignment, uncapped indemnity and non-competes, and found nothing it would mark critical or serious.",
  cleanNoted: (count: number) =>
    count === 1 ? "One clause is still worth a look, listed below." : `${count} clauses are still worth a look, listed below.`,
  cleanNothing: "Redline didn't find other clauses that shift cost or control onto you.",
  counterOfferHeading: "Ask for this instead",
  counterOfferSource: "Suggested by Redline, not quoted from the document",
  counterOfferUnavailable: "Redline couldn't suggest other wording for this clause.",
  copy: "Copy wording",
  copyLabel: "Copy the suggested wording",
  copied: "Copied",
  copyFailed: "Couldn't copy. Select the text and copy it by hand.",
} as const;

function tierCounts(flags: readonly Flag[]): string {
  const count = (tier: SeverityTier) => flags.filter((flag) => flag.severity === tier).length;
  return `${count("critical")} critical · ${count("serious")} serious · ${count("worth-noting")} worth noting`;
}

function printDelay(ms: number) {
  return { ["--print-delay" as string]: `${ms}ms` } as React.CSSProperties;
}

/**
 * The facts panel for a real document: start the analysis, wait for it, then
 * the summary and the warnings, heaviest first, each with its full quote.
 */
export function DocumentFacts({
  run,
  onStart,
  activeIndex,
  onSelect,
}: {
  run: AnalysisRun;
  onStart: () => void;
  activeIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="px-5 pb-6 pt-5 sm:px-7">
      <div className="barline pb-1.5">
        <h2 className="text-[1.625rem] font-extrabold uppercase leading-[0.9] tracking-[-0.01em] sm:text-[2rem]">
          Contract Facts
        </h2>
      </div>

      <div aria-live="polite">
        {run.status === "idle" && (
          <div className="pt-3">
            <p className={bodyClass}>{FACTS_COPY.intro}</p>
            <button type="button" onClick={onStart} className={`${buttonClass} mt-4`}>
              {FACTS_COPY.start}
            </button>
          </div>
        )}

        {run.status === "running" && (
          <div role="status" className="mt-4 border-[3px] border-ink px-4 py-3">
            <p className="text-[1rem] font-bold leading-[1.45]">{FACTS_COPY.running}</p>
            <p className="pt-0.5 text-[0.9375rem] leading-[1.55] text-ink-soft">{FACTS_COPY.runningDetail}</p>
          </div>
        )}

        {run.status === "failed" && (
          <div className="pt-4">
            <p role="alert" className="max-w-[68ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45]">
              {run.message}
            </p>
            <button type="button" onClick={onStart} className={`${buttonClass} mt-4`}>
              {FACTS_COPY.retry}
            </button>
          </div>
        )}

        {run.status === "done" && (
          <AnalysisResult analysis={run.analysis} activeIndex={activeIndex} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}

function AnalysisResult({
  analysis,
  activeIndex,
  onSelect,
}: {
  analysis: Analysis;
  activeIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const { flags } = analysis;
  const clean = !flags.some((flag) => flag.severity === "critical" || flag.severity === "serious");

  return (
    <>
      <section className="pt-4">
        <h3 className={labelClass}>{FACTS_COPY.summaryHeading}</h3>
        <p className={`${bodyClass} whitespace-pre-line`}>{analysis.summary}</p>
      </section>

      <div className="print-bar barline-thin mt-5" />

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-3">
          <h3 className="text-[1.125rem] font-extrabold uppercase tracking-[0.04em]">{FACTS_COPY.warningsHeading}</h3>
          <p className={`tabular ${narrowClass}`}>{tierCounts(flags)}</p>
        </div>

        {clean && (
          <div className="print-set hairline pb-4 pt-3">
            <p className="text-[1.25rem] font-extrabold uppercase leading-[1.05] tracking-[0.02em]">
              {FACTS_COPY.cleanHeading}
            </p>
            <p className={bodyClass}>{FACTS_COPY.cleanBody}</p>
            <p className={bodyClass}>
              {flags.length > 0 ? FACTS_COPY.cleanNoted(flags.length) : FACTS_COPY.cleanNothing}
            </p>
          </div>
        )}

        {flags.length > 0 && (
          <>
            <p className={`${narrowClass} pt-2`}>{FACTS_COPY.selectHint}</p>
            <ul className="pt-4">
              {flags.map((flag, i) => (
                <li key={`${flag.citation.start}:${flag.citation.end}`} className={i > 0 ? "pt-5" : undefined}>
                  <FlagBlock
                    flag={flag}
                    active={activeIndex === i}
                    onSelect={() => onSelect(i)}
                    delay={Math.min(280 + i * 90, 1000)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}

function FlagBlock({
  flag,
  active,
  onSelect,
  delay,
}: {
  flag: FlagWithCounterOffer;
  active: boolean;
  onSelect: () => void;
  delay: number;
}) {
  const isCritical = flag.severity === "critical";
  return (
    <div className={`print-set ${TIER_RULE[flag.severity]}`} style={printDelay(delay)}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`block w-full cursor-pointer px-4 py-4 text-left transition-colors ${
          active ? "bg-panel-field-active" : "hover:bg-panel-field-hover"
        }`}
      >
        <span className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
          <span
            className={`text-[0.9375rem] font-extrabold uppercase tracking-[0.06em] ${isCritical ? "text-critical" : "text-ink"}`}
          >
            {TIER_LABEL[flag.severity]}
          </span>
          <span className={narrowClass}>{clauseLabel(flag.clauseType)}</span>
        </span>

        <span
          className={`block whitespace-pre-line break-words pt-2.5 font-[family-name:var(--font-source)] ${TIER_QUOTE[flag.severity]}`}
        >
          &ldquo;{flag.citation.text}&rdquo;
        </span>

        <span className={`block pt-3 ${narrowClass}`}>{AXIS_LABEL[flag.axis]}</span>
        <span className="block max-w-[68ch] pt-1 text-[0.9375rem] leading-[1.55] text-ink-soft">{flag.rationale}</span>
      </button>

      {/* Only ever rendered inside a flag block, under the citation it answers. */}
      <CounterOfferBlock counterOffer={flag.counterOffer} />
    </div>
  );
}

type CopyState = "idle" | "copied" | "failed";

/**
 * The reader's proposed wording for the clause quoted above it. It isn't
 * source text, so it is set in the panel's own face, never in Tinos.
 */
function CounterOfferBlock({ counterOffer }: { counterOffer: CounterOffer }) {
  const [copy, setCopy] = useState<CopyState>("idle");

  useEffect(() => {
    if (copy !== "copied") return;
    const timer = setTimeout(() => setCopy("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copy]);

  if (counterOffer.status === "unavailable") {
    return (
      <div className="px-4 pb-4">
        <p className="border-t border-ink pt-3 text-[0.9375rem] leading-[1.55] text-ink-soft">
          {FACTS_COPY.counterOfferUnavailable}
        </p>
      </div>
    );
  }

  const { proposedLanguage, note } = counterOffer;

  async function copyWording() {
    try {
      await navigator.clipboard.writeText(proposedLanguage);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="border-t border-ink pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
          <h4 className={labelClass}>{FACTS_COPY.counterOfferHeading}</h4>
          <button
            type="button"
            onClick={() => void copyWording()}
            aria-label={copy === "copied" ? FACTS_COPY.copied : FACTS_COPY.copyLabel}
            className="cursor-pointer text-[0.9375rem] font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]"
          >
            {copy === "copied" ? FACTS_COPY.copied : FACTS_COPY.copy}
          </button>
        </div>
        <p className={`${narrowClass} pt-0.5`}>{FACTS_COPY.counterOfferSource}</p>
        <p className="max-w-[68ch] whitespace-pre-line break-words pt-2.5 text-[1rem] leading-[1.55] text-ink">
          {proposedLanguage}
        </p>
        {note && <p className="max-w-[68ch] pt-1.5 text-[0.9375rem] leading-[1.55] text-ink-soft">{note}</p>}
        <p aria-live="polite" className="text-[0.9375rem] leading-[1.55] text-ink-soft">
          {copy === "failed" && FACTS_COPY.copyFailed}
          {copy === "copied" && <span className="sr-only">{FACTS_COPY.copied}</span>}
        </p>
      </div>
    </div>
  );
}
