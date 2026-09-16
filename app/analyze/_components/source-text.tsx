"use client";

import { useEffect, useRef } from "react";
import type { Flag, SeverityTier } from "@/lib/analysis/types";

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

export interface Selection {
  index: number;
  /** Changes on every selection, so choosing the same flag again scrolls again. */
  request: number;
}

interface Segment {
  start: number;
  end: number;
  /** Indexes into `flags` of every flag whose citation covers this segment. */
  covering: number[];
}

/**
 * Split the text into paragraphs, and each paragraph into runs that are
 * either uncited or covered by the same set of citations. Offsets are the
 * citations' own `start`/`end`, so a mark covers exactly the cited span.
 */
function paragraphSegments(text: string, flags: readonly Flag[]): Segment[][] {
  const paragraphs: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const gap of text.matchAll(/\n{2,}/g)) {
    paragraphs.push({ start: cursor, end: gap.index });
    cursor = gap.index + gap[0].length;
  }
  paragraphs.push({ start: cursor, end: text.length });

  return paragraphs.map(({ start, end }) => {
    const cuts = new Set([start, end]);
    for (const flag of flags) {
      if (flag.citation.start > start && flag.citation.start < end) cuts.add(flag.citation.start);
      if (flag.citation.end > start && flag.citation.end < end) cuts.add(flag.citation.end);
    }
    const points = [...cuts].sort((a, b) => a - b);
    const segments: Segment[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [a, b] = [points[i], points[i + 1]];
      const covering = flags.flatMap((flag, index) => (flag.citation.start < b && flag.citation.end > a ? [index] : []));
      segments.push({ start: a, end: b, covering });
    }
    return segments;
  });
}

/**
 * The extracted text, shown exactly as it was analysed. It is the source
 * document's own voice, so it is set in Tinos (DESIGN.md, the Three-Voice
 * Rule). Once there are flags, each cited span is marked, and selecting a
 * mark selects its flag.
 */
export function SourceText({
  text,
  flags = [],
  selection = null,
  onSelect,
  className = "",
}: {
  text: string;
  flags?: readonly Flag[];
  selection?: Selection | null;
  onSelect?: (index: number) => void;
  className?: string;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<Map<number, HTMLElement>>(new Map());
  const paragraphs = paragraphSegments(text, flags);
  const activeIndex = selection?.index ?? null;

  useEffect(() => {
    if (!selection) return;
    const container = scrollRef.current;
    const mark = markRefs.current.get(selection.index);
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

  const firstSegment = new Map<number, string>();
  paragraphs.forEach((segments, p) =>
    segments.forEach((segment, s) => {
      for (const index of segment.covering) if (!firstSegment.has(index)) firstSegment.set(index, `${p}:${s}`);
    }),
  );

  return (
    <article
      ref={panelRef}
      className={`border-[3px] border-ink bg-panel-field text-ink ${className}`}
      aria-labelledby="source-text-heading"
    >
      <header className="hairline px-5 py-3.5">
        <h2 id="source-text-heading" className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">
          {flags.length > 0 ? "The document itself" : "Extracted text"}
        </h2>
        <p className="pt-0.5 font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
          {flags.length > 0 ? "Every warning quotes a passage in here" : "What Redline read, word for word"}
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
              if (segment.covering.length === 0) return <span key={s}>{content}</span>;

              // Where citations overlap, the selected one wins, then the heaviest.
              // Flags arrive heaviest first, so the lowest index is the heaviest.
              const index =
                activeIndex !== null && segment.covering.includes(activeIndex)
                  ? activeIndex
                  : Math.min(...segment.covering);
              const flag = flags[index];
              const isActive = index === activeIndex;
              const refKey = `${p}:${s}`;

              return (
                <span
                  key={s}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  ref={(node) => {
                    for (const covered of segment.covering) {
                      if (firstSegment.get(covered) !== refKey) continue;
                      if (node) markRefs.current.set(covered, node);
                      else markRefs.current.delete(covered);
                    }
                  }}
                  onClick={() => onSelect?.(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect?.(index);
                    }
                  }}
                  className={[
                    "cursor-pointer underline-offset-[3px]",
                    MARK_TIER[flag.severity],
                    isActive ? `outline-2 outline-offset-2 ${OUTLINE_TIER[flag.severity]}` : "hover:bg-panel-field-active",
                  ].join(" ")}
                >
                  {content}
                </span>
              );
            })}
          </p>
        ))}
      </div>
    </article>
  );
}
