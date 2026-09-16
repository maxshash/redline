"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  AGREEMENT,
  DOCUMENT_LOT,
  DOCUMENT_NAME,
  DOCUMENT_PARTIES,
  FINDINGS,
  SUMMARY,
  TIER_LABEL,
  type Finding,
} from "./demo-agreement";

/**
 * Severity is rule weight, and Critical is the only tier carrying colour.
 * A red-line match is never a severity device — it is an overprint, and it is
 * tested independently of the tier so one clause can carry both signals.
 */
const TIER_RULE: Record<string, string> = {
  critical: "rule-critical",
  serious: "rule-serious",
  noted: "rule-noted",
};

/** Heaviest rule first. A red-line match with no tier sits apart, at the end. */
const TIER_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  noted: 2,
};

const ORDERED_FINDINGS = [...FINDINGS].sort(
  (a, b) =>
    (a.tier ? TIER_ORDER[a.tier] : 3) - (b.tier ? TIER_ORDER[b.tier] : 3),
);

/** Real scale difference does the ranking. The Critical quote leads the page. */
const TIER_QUOTE: Record<string, string> = {
  critical: "text-[1.75rem] leading-[1.2] sm:text-[2.75rem] sm:leading-[1.14]",
  serious: "text-[1.125rem] leading-[1.35] sm:text-[1.375rem]",
  noted: "text-[1rem] leading-[1.45] sm:text-[1.0625rem]",
};

/** In the document, a sentence is marked with its own tier's device. */
const MARK_TIER: Record<string, string> = {
  critical: "bg-critical-mark underline decoration-critical decoration-[3px]",
  serious: "underline decoration-ink decoration-[3px]",
  noted: "underline decoration-ink decoration-[1px]",
};

function printDelay(ms: number) {
  return { ["--print-delay" as string]: `${ms}ms` } as React.CSSProperties;
}

function Overprint({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`overprint-stamp inline-block text-[0.6875rem] leading-tight ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

export function ContractFacts() {
  const [activeId, setActiveId] = useState<string | null>("renewal");
  const sourceRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const markRefs = useRef<Record<string, HTMLElement | null>>({});

  const select = useCallback((id: string) => {
    setActiveId(id);
    const container = sourceRef.current;
    const mark = markRefs.current[id];
    if (!container || !mark) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

    // Below lg the document panel is stacked far down the page, so scrolling
    // only its inner container would move something the reader cannot see.
    const stacked = !window.matchMedia("(min-width: 1024px)").matches;
    if (stacked && asideRef.current) {
      asideRef.current.scrollIntoView({ behavior, block: "start" });
    }

    const top =
      mark.offsetTop - container.clientHeight / 2 + mark.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, top), behavior });
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-5">
      {/* ------ The carton's display panel, then the facts panel ------ */}
      <article className="print-set border-[3px] border-ink bg-panel-field text-ink lg:col-span-7">
        <header className="px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="hairline flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2.5">
            <p className="text-[1.25rem] font-extrabold uppercase leading-none tracking-[0.02em]">
              Redline
            </p>
            <p className="font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.09em] text-ink-soft">
              Contract review for people without a lawyer on retainer
            </p>
          </div>

          <h1 className="max-w-[24ch] pt-4 text-[1.875rem] font-extrabold uppercase leading-[0.95] tracking-[-0.015em] sm:text-[2.25rem]">
            Every warning quotes the sentence it came from
          </h1>
          <p className="max-w-[64ch] pt-2.5 text-[1rem] leading-[1.5] text-ink-soft">
            You are about to sign something you cannot negotiate. Below is a
            fictional agreement Redline has already read.
          </p>

          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="text-[1.625rem] font-extrabold uppercase leading-[0.9] tracking-[-0.01em] sm:text-[2rem]">
              Contract Facts
            </h2>
            <Overprint className="print-stamp" style={printDelay(760)}>
              {DOCUMENT_LOT}
            </Overprint>
          </div>
          <div className="print-bar barline" style={printDelay(120)} />

          <p className="pt-2 font-[family-name:var(--font-panel-narrow)] text-[0.9375rem] uppercase tracking-[0.08em]">
            {DOCUMENT_NAME}
            <span className="text-ink-soft"> · {DOCUMENT_PARTIES}</span>
          </p>
          <p className="hairline pb-3 pt-1 font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
            Illustrative document. Not a real client file.
          </p>
        </header>

        <section className="px-5 pt-4 sm:px-7">
          <h3 className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">
            What this document does
          </h3>
          <p className="max-w-[62ch] pt-1.5 text-[1rem] leading-[1.55] text-ink-soft">
            {SUMMARY}
          </p>
          <Link
            href="/sign-up"
            className="mt-4 inline-block border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field"
          >
            Try it on a document
          </Link>
        </section>

        <div className="print-bar barline-thin mt-5" style={printDelay(200)} />

        <section className="px-5 pb-6 sm:px-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-3">
            <h3 className="text-[1.125rem] font-extrabold uppercase tracking-[0.04em]">
              Warnings
            </h3>
            <p className="tabular font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
              1 critical · 2 serious · 1 worth noting · 2 red-line matches
            </p>
          </div>

          <ul className="pt-4">
            {ORDERED_FINDINGS.map((finding, i) => (
              <li key={finding.id} className={i > 0 ? "pt-5" : undefined}>
                <FindingBlock
                  finding={finding}
                  active={activeId === finding.id}
                  onSelect={() => select(finding.id)}
                  delay={280 + i * 90}
                />
              </li>
            ))}
          </ul>
        </section>
      </article>

      {/* ---------------- The source document ---------------- */}
      <aside
        ref={asideRef}
        className="print-set border-[3px] border-ink bg-panel-field text-ink lg:sticky lg:top-5 lg:col-span-5"
        style={printDelay(160)}
      >
        <header className="hairline px-5 py-3.5">
          <h2 className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">
            The document itself
          </h2>
          <p className="pt-0.5 font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
            Every warning above quotes a sentence in here
          </p>
        </header>

        <div
          ref={sourceRef}
          className="relative max-h-[30rem] overflow-y-auto px-5 py-5 lg:max-h-[40rem]"
        >
          {AGREEMENT.map((clause) => (
            <section key={clause.number} className="pb-4 last:pb-0">
              <h3 className="font-[family-name:var(--font-panel-narrow)] text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink-soft">
                {clause.number}. {clause.heading}
              </h3>
              <p className="pt-1 font-[family-name:var(--font-source)] text-[0.9375rem] leading-[1.7]">
                {clause.body.map((segment, i) => {
                  if (!segment.findingId)
                    return <span key={i}>{segment.text}</span>;
                  const id = segment.findingId;
                  const finding = FINDINGS.find((f) => f.id === id);
                  const isActive = activeId === id;

                  // Tier and red-line match are tested separately, so a clause
                  // carrying both shows both devices.
                  const tierMark = finding?.tier ? MARK_TIER[finding.tier] : "";
                  const outline = !finding?.tier
                    ? "outline-overprint"
                    : finding.tier === "critical"
                      ? "outline-critical"
                      : "outline-ink";

                  return (
                    <button
                      key={i}
                      type="button"
                      ref={(node) => {
                        markRefs.current[id] = node;
                      }}
                      onClick={() => select(id)}
                      aria-pressed={isActive}
                      className={[
                        "cursor-pointer text-left font-[family-name:var(--font-source)]",
                        "underline-offset-[3px]",
                        tierMark,
                        isActive
                          ? `outline-2 outline-offset-2 ${outline}`
                          : "hover:bg-panel-field-active",
                      ].join(" ")}
                    >
                      {finding?.redLine ? (
                        <span className="mark-redline">{segment.text}</span>
                      ) : (
                        segment.text
                      )}
                    </button>
                  );
                })}
              </p>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}

function FindingBlock({
  finding,
  active,
  onSelect,
  delay,
}: {
  finding: Finding;
  active: boolean;
  onSelect: () => void;
  delay: number;
}) {
  // A red-line match with no tier borrows no severity rule: it gets the
  // overprint's own dashed rule instead (ADR 0007).
  const rule = finding.tier ? TIER_RULE[finding.tier] : "rule-redline";
  const quoteSize = finding.tier ? TIER_QUOTE[finding.tier] : TIER_QUOTE.noted;
  const isCritical = finding.tier === "critical";

  return (
    <div className={`print-set ${rule}`} style={printDelay(delay)}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`block w-full cursor-pointer px-4 py-4 text-left transition-colors ${
          active ? "bg-panel-field-active" : "hover:bg-panel-field-hover"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
          <span
            className={`text-[0.9375rem] font-extrabold uppercase tracking-[0.06em] ${
              isCritical ? "text-critical" : "text-ink"
            }`}
          >
            {finding.tier ? TIER_LABEL[finding.tier] : "No severity tier"}
          </span>
          <span className="font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
            Section {finding.section} · {finding.heading}
          </span>
        </div>

        <blockquote
          className={`pt-2.5 font-[family-name:var(--font-source)] ${quoteSize}`}
        >
          &ldquo;{finding.quote}&rdquo;
        </blockquote>

        <p className="max-w-[68ch] pt-3 text-[0.9375rem] leading-[1.55] text-ink-soft">
          {finding.reading}
        </p>

        {finding.redLine ? (
          <p className="pt-3">
            <Overprint>
              RED LINE MATCH — &ldquo;{finding.redLine}&rdquo;
            </Overprint>
          </p>
        ) : null}
      </button>
    </div>
  );
}
