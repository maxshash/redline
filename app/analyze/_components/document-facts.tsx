"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AXIS_LABEL, TIER_LABEL, clauseLabel } from "@/lib/analysis/labels";
import { groupRedLineMatches } from "@/lib/analysis/red-line-groups";
import type { RedLinesUsed } from "@/lib/analysis/run";
import type {
  Analysis,
  CounterOffer,
  Flag,
  FlagWithCounterOffer,
  RedLineMatch,
  SeverityTier,
} from "@/lib/analysis/types";
import type { FindingKey } from "./source-text";

/**
 * Where a shown analysis lives. Set for a document in the library: "saved" is
 * a check read from (or just written to) storage, "not-saved" one that ran but
 * couldn't be stored. Left out on /analyze, where nothing is stored this way.
 */
export type AnalysisRecord = { kind: "saved"; checkedAt: string } | { kind: "not-saved" };

/** What the page knows about the analysis of the document in hand. */
export type AnalysisRun =
  | { status: "idle" }
  | { status: "running" }
  | { status: "failed"; message: string; retryLabel?: string }
  | { status: "done"; analysis: Analysis; redLines: RedLinesUsed; record?: AnalysisRecord };

const checkedDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

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
  redLinesHeading: "Your red lines",
  redLineStamp: "Your red line",
  redLineLabel: "You asked about this",
  redLineNoTier: "No severity tier",
  redLineCount: (count: number) => (count === 1 ? "1 match" : `${count} matches`),
  redLinesNoneMatched: (count: number) =>
    count === 1
      ? "Your red line doesn't come up in this document."
      : `None of your ${count} red lines come up in this document.`,
  redLinesAllOnWarnings: "Each match is on one of the warnings above.",
  redLinesSomeOnWarnings: (count: number) =>
    count === 1 ? "One more match is on a warning above." : `${count} more matches are on warnings above.`,
  redLinesEmptyList: "You haven't added any red lines yet.",
  redLinesEmptyListLink: "Add some",
  redLinesEmptyListAfter: "and Redline will look for them next time.",
  redLinesSignedOut: "to add your own red lines.",
  redLinesSignIn: "Sign in",
  redLinesUnavailable: "Red lines need an account, and accounts aren't open yet.",
  redLinesFailed: "Couldn't load your red lines, so this check didn't look for them.",
  redLinesCheckedAgainst: "Checked against these red lines",
  redLinesNoneChecked: "This check didn't look for any red lines.",
  checkedOn: "Checked on",
  checkNotSaved: "Redline couldn't save this check. It will be gone when you leave this page.",
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
  activeKey,
  onSelect,
}: {
  run: AnalysisRun;
  onStart: () => void;
  activeKey: FindingKey | null;
  onSelect: (key: FindingKey) => void;
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
              {run.retryLabel ?? FACTS_COPY.retry}
            </button>
          </div>
        )}

        {run.status === "done" && (
          <AnalysisResult
            analysis={run.analysis}
            redLines={run.redLines}
            record={run.record}
            activeKey={activeKey}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
}

function AnalysisResult({
  analysis,
  redLines,
  record,
  activeKey,
  onSelect,
}: {
  analysis: Analysis;
  redLines: RedLinesUsed;
  record?: AnalysisRecord;
  activeKey: FindingKey | null;
  onSelect: (key: FindingKey) => void;
}) {
  const { flags, redLineMatches } = analysis;
  const groups = groupRedLineMatches(flags, redLineMatches);
  const clean = !flags.some((flag) => flag.severity === "critical" || flag.severity === "serious");

  return (
    <>
      {record?.kind === "saved" && (
        <p className={`tabular ${narrowClass} pt-3`}>
          {FACTS_COPY.checkedOn}{" "}
          <time dateTime={record.checkedAt}>{checkedDate.format(new Date(record.checkedAt))}</time>
        </p>
      )}
      {record?.kind === "not-saved" && (
        <p role="alert" className="mt-4 max-w-[68ch] border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45]">
          {FACTS_COPY.checkNotSaved}
        </p>
      )}

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
                    matches={groups.onFlag[i].map((m) => redLineMatches[m])}
                    active={activeKey === `flag-${i}`}
                    onSelect={() => onSelect(`flag-${i}`)}
                    delay={Math.min(280 + i * 90, 1000)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <RedLinesSection
        redLines={redLines}
        saved={record?.kind === "saved"}
        matches={redLineMatches}
        onTheirOwn={groups.onTheirOwn}
        activeKey={activeKey}
        onSelect={onSelect}
        firstDelay={Math.min(280 + flags.length * 90, 1000)}
      />
    </>
  );
}

const quietClass = "max-w-[62ch] text-[0.9375rem] leading-[1.55] text-ink-soft";
const quietLinkClass = "font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]";

/**
 * Red-line matches: "you asked about this", separate from "Redline judged this
 * dangerous" (ADR 0007). Matches on a warning are stamped on that warning;
 * the rest are listed here, each with its full citation and no tier.
 */
function RedLinesSection({
  redLines,
  saved,
  matches,
  onTheirOwn,
  activeKey,
  onSelect,
  firstDelay,
}: {
  redLines: RedLinesUsed;
  /** A saved check: say which red lines it ran with, since the list may have changed since. */
  saved: boolean;
  matches: readonly RedLineMatch[];
  onTheirOwn: readonly number[];
  activeKey: FindingKey | null;
  onSelect: (key: FindingKey) => void;
  firstDelay: number;
}) {
  if (saved && redLines.status === "loaded" && redLines.redLines.length === 0) {
    return <p className={`${quietClass} mt-6 border-t border-ink pt-3`}>{FACTS_COPY.redLinesNoneChecked}</p>;
  }

  if (redLines.status !== "loaded" || redLines.redLines.length === 0) {
    return (
      <p className={`${quietClass} mt-6 border-t border-ink pt-3`}>
        {redLines.status === "signed-out" && (
          <>
            <Link href="/sign-in?next=%2Fred-lines" className={quietLinkClass}>
              {FACTS_COPY.redLinesSignIn}
            </Link>{" "}
            {FACTS_COPY.redLinesSignedOut}
          </>
        )}
        {redLines.status === "unavailable" && FACTS_COPY.redLinesUnavailable}
        {redLines.status === "failed" && FACTS_COPY.redLinesFailed}
        {redLines.status === "loaded" && (
          <>
            {FACTS_COPY.redLinesEmptyList}{" "}
            <Link href="/red-lines" className={quietLinkClass}>
              {FACTS_COPY.redLinesEmptyListLink}
            </Link>
            , {FACTS_COPY.redLinesEmptyListAfter}
          </>
        )}
      </p>
    );
  }

  const onWarnings = matches.length - onTheirOwn.length;

  return (
    <section className="mt-6">
      <div className="barline-thin" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-3">
        <h3 className="text-[1.125rem] font-extrabold uppercase tracking-[0.04em]">{FACTS_COPY.redLinesHeading}</h3>
        <p className={`tabular ${narrowClass}`}>{FACTS_COPY.redLineCount(matches.length)}</p>
      </div>

      {saved && (
        <div className="pt-2">
          <p className={narrowClass}>{FACTS_COPY.redLinesCheckedAgainst}</p>
          <ul className="max-w-[68ch] pt-1">
            {redLines.redLines.map((redLine) => (
              <li key={redLine.id} className="break-words text-[0.9375rem] leading-[1.55] text-ink">
                {redLine.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {matches.length === 0 && <p className={bodyClass}>{FACTS_COPY.redLinesNoneMatched(redLines.redLines.length)}</p>}
      {matches.length > 0 && onTheirOwn.length === 0 && <p className={bodyClass}>{FACTS_COPY.redLinesAllOnWarnings}</p>}

      {onTheirOwn.length > 0 && (
        <>
          <ul className="pt-4">
            {onTheirOwn.map((m, i) => (
              <li key={`${matches[m].redLine.id}:${matches[m].citation.start}`} className={i > 0 ? "pt-5" : undefined}>
                <RedLineMatchBlock
                  match={matches[m]}
                  active={activeKey === `match-${m}`}
                  onSelect={() => onSelect(`match-${m}`)}
                  delay={Math.min(firstDelay + i * 90, 1000)}
                />
              </li>
            ))}
          </ul>
          {onWarnings > 0 && <p className={`${bodyClass} pt-4`}>{FACTS_COPY.redLinesSomeOnWarnings(onWarnings)}</p>}
        </>
      )}
    </section>
  );
}

/** A red-line match with no warning under it: the overprint's own dashed rule, never a severity rule. */
function RedLineMatchBlock({
  match,
  active,
  onSelect,
  delay,
}: {
  match: RedLineMatch;
  active: boolean;
  onSelect: () => void;
  delay: number;
}) {
  return (
    <div className="print-set rule-redline" style={printDelay(delay)}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`block w-full cursor-pointer px-4 py-4 text-left transition-colors ${
          active ? "bg-panel-field-active" : "hover:bg-panel-field-hover"
        }`}
      >
        <span className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
          <span className="text-[0.9375rem] font-extrabold uppercase tracking-[0.06em] text-ink">
            {FACTS_COPY.redLineLabel}
          </span>
          <span className={narrowClass}>{FACTS_COPY.redLineNoTier}</span>
        </span>

        <span
          className={`block whitespace-pre-line break-words pt-2.5 font-[family-name:var(--font-source)] ${TIER_QUOTE["worth-noting"]}`}
        >
          &ldquo;{match.citation.text}&rdquo;
        </span>

        <RedLineStamp match={match} />
      </button>
    </div>
  );
}

/** The overprint: the reader's red line, stamped on after the panel was printed, and how the clause relates to it. */
function RedLineStamp({ match }: { match: RedLineMatch }) {
  return (
    <span className="block pt-3">
      <span className="overprint-stamp inline-block max-w-full break-words text-[0.6875rem] leading-tight">
        {FACTS_COPY.redLineStamp}: {match.redLine.text}
      </span>
      <span className="block max-w-[68ch] pt-1 text-[0.9375rem] leading-[1.55] text-ink-soft">{match.explanation}</span>
    </span>
  );
}

function FlagBlock({
  flag,
  matches,
  active,
  onSelect,
  delay,
}: {
  flag: FlagWithCounterOffer;
  /** Red-line matches on this sentence. Stamped on; the tier above is untouched. */
  matches: readonly RedLineMatch[];
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

        {matches.map((match) => (
          <RedLineStamp key={`${match.redLine.id}:${match.citation.start}`} match={match} />
        ))}
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
