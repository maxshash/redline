"use client";

import { useEffect, useRef } from "react";
import { groupRedLineMatches } from "@/lib/analysis/red-line-groups";
import type { Flag, RedLineMatch, SeverityTier } from "@/lib/analysis/types";

/** In the document, a cited span carries its own tier's device (DESIGN.md). */
const MARK_TIER: Record<SeverityTier, string> = {
  critical: "bg-critical-mark underline decoration-critical decoration-[3px]",
  serious: "underline decoration-ink decoration-[3px]",
  "worth-noting": "underline decoration-ink decoration-[1px]",
};

const OUTLINE_TIER: Record<SeverityTier, string> = {
  critical: "outline-critical",
  serious: "outline-ink",
  "worth-noting": "outline-ink",
};

/**
 * What can be selected: a flag, or a red-line match shown on its own. A match
 * that overlaps a flag is shown on that flag, so selecting it selects the flag.
 */
export type FindingKey = `flag-${number}` | `match-${number}`;

export interface Selection {
  key: FindingKey;
  /** Changes on every selection, so choosing the same finding again scrolls again. */
  request: number;
}

interface Segment {
  start: number;
  end: number;
  /** Indexes into `flags` of every flag whose citation covers this segment. */
  flags: number[];
  /** Indexes into `matches` of every red-line match whose citation covers this segment. */
  matches: number[];
}

type Span = { start: number; end: number };

/**
 * Split the text into paragraphs, and each paragraph into runs covered by the
 * same flags and red-line matches. Offsets are the citations' own
 * `start`/`end`, so a mark covers exactly the cited span.
 */
function paragraphSegments(text: string, flags: readonly Span[], matches: readonly Span[]): Segment[][] {
  const paragraphs: Span[] = [];
  let cursor = 0;
  for (const gap of text.matchAll(/\n{2,}/g)) {
    paragraphs.push({ start: cursor, end: gap.index });
    cursor = gap.index + gap[0].length;
  }
  paragraphs.push({ start: cursor, end: text.length });

  const covering = (spans: readonly Span[], a: number, b: number) =>
    spans.flatMap((span, index) => (span.start < b && span.end > a ? [index] : []));

  return paragraphs.map(({ start, end }) => {
    const cuts = new Set([start, end]);
    for (const span of [...flags, ...matches]) {
      if (span.start > start && span.start < end) cuts.add(span.start);
      if (span.end > start && span.end < end) cuts.add(span.end);
    }
    const points = [...cuts].sort((a, b) => a - b);
    const segments: Segment[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [a, b] = [points[i], points[i + 1]];
      segments.push({ start: a, end: b, flags: covering(flags, a, b), matches: covering(matches, a, b) });
    }
    return segments;
  });
}

/**
 * The extracted text, shown exactly as it was analysed. It is the source
 * document's own voice, so it is set in Tinos (DESIGN.md, the Three-Voice
 * Rule). Each flag's span carries its tier's underline; each red-line match's
 * span carries the dashed overprint underline on an inner span, so a sentence
 * that is both shows both. Selecting a mark selects its finding.
 */
export function SourceText({
  text,
  flags = [],
  matches = [],
  selection = null,
  onSelect,
  className = "",
}: {
  text: string;
  flags?: readonly Flag[];
  matches?: readonly RedLineMatch[];
  selection?: Selection | null;
  onSelect?: (key: FindingKey) => void;
  className?: string;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<Map<FindingKey, HTMLElement>>(new Map());
  const paragraphs = paragraphSegments(
    text,
    flags.map((flag) => flag.citation),
    matches.map((match) => match.citation),
  );
  const groups = groupRedLineMatches(flags, matches);
  const activeKey = selection?.key ?? null;

  const matchTarget = (m: number): FindingKey => {
    const flag = groups.onFlag.findIndex((onThisFlag) => onThisFlag.includes(m));
    return flag === -1 ? `match-${m}` : `flag-${flag}`;
  };

  useEffect(() => {
    if (!selection) return;
    const container = scrollRef.current;
    const mark = markRefs.current.get(selection.key);
    if (!container || !mark) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

    // Below lg the document is stacked under the analysis, so bring the panel
    // into view first; scrolling only its inner container would move nothing
    // the reader can see.
    const stacked = !window.matchMedia("(min-width: 1024px)").matches;
    if (stacked && panelRef.current) panelRef.current.scrollIntoView({ behavior, block: "start" });

    const top = mark.offsetTop - container.clientHeight / 2 + mark.offsetHeight / 2;
    container.scrollTo({ top: Math.max(0, top), behavior });
  }, [selection]);

  // The keys each segment is part of, and the first segment for each key (where selecting scrolls to).
  const keysOf = (segment: Segment): FindingKey[] => [
    ...segment.flags.map((f): FindingKey => `flag-${f}`),
    ...segment.matches.filter((m) => groups.onTheirOwn.includes(m)).map((m): FindingKey => `match-${m}`),
  ];
  const firstSegment = new Map<FindingKey, string>();
  paragraphs.forEach((segments, p) =>
    segments.forEach((segment, s) => {
      for (const key of keysOf(segment)) if (!firstSegment.has(key)) firstSegment.set(key, `${p}:${s}`);
    }),
  );

  const hasFindings = flags.length > 0 || matches.length > 0;

  return (
    <article
      ref={panelRef}
      className={`border-[3px] border-ink bg-panel-field text-ink ${className}`}
      aria-labelledby="source-text-heading"
    >
      <header className="hairline px-5 py-3.5">
        <h2 id="source-text-heading" className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">
          {hasFindings ? "The document itself" : "Extracted text"}
        </h2>
        <p className="pt-0.5 font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
          {hasFindings ? "Every warning and red-line match quotes a passage in here" : "What Redline read, word for word"}
        </p>
      </header>
      <div
        ref={scrollRef}
        className="relative max-h-[30rem] overflow-y-auto px-5 py-5 lg:max-h-[40rem]"
        tabIndex={0}
        aria-label="Document text"
      >
        {paragraphs.map((segments, p) => (
          <p
            key={p}
            className="whitespace-pre-line break-words pb-4 font-[family-name:var(--font-source)] text-[0.9375rem] leading-[1.7] last:pb-0"
          >
            {segments.map((segment, s) => {
              const content = text.slice(segment.start, segment.end);
              if (segment.flags.length === 0 && segment.matches.length === 0) return <span key={s}>{content}</span>;

              const keys = keysOf(segment);
              const targets = [...keys, ...segment.matches.map(matchTarget)];
              // The selected finding wins, then the heaviest flag (flags arrive
              // heaviest first), then the first red-line match.
              const target: FindingKey = activeKey !== null && targets.includes(activeKey) ? activeKey : targets[0];
              const isActive = activeKey !== null && keys.includes(activeKey);

              const shownFlag =
                activeKey?.startsWith("flag-") && segment.flags.includes(Number(activeKey.slice(5)))
                  ? Number(activeKey.slice(5))
                  : segment.flags.length > 0
                    ? Math.min(...segment.flags)
                    : null;
              const tier = shownFlag === null ? null : flags[shownFlag].severity;
              const outline = activeKey?.startsWith("flag-") && tier ? OUTLINE_TIER[tier] : "outline-overprint";
              const refKey = `${p}:${s}`;

              return (
                <span
                  key={s}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  ref={(node) => {
                    for (const key of keys) {
                      if (firstSegment.get(key) !== refKey) continue;
                      if (node) markRefs.current.set(key, node);
                      else markRefs.current.delete(key);
                    }
                  }}
                  onClick={() => onSelect?.(target)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect?.(target);
                    }
                  }}
                  className={[
                    "cursor-pointer underline-offset-[3px]",
                    tier ? MARK_TIER[tier] : "",
                    isActive ? `outline-2 outline-offset-2 ${outline}` : "hover:bg-panel-field-active",
                  ].join(" ")}
                >
                  {segment.matches.length > 0 ? <span className="mark-redline">{content}</span> : content}
                </span>
              );
            })}
          </p>
        ))}
      </div>
    </article>
  );
}
