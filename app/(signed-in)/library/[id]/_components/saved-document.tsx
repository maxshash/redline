"use client";

import Link from "next/link";
import { useState } from "react";
import { analyzeKeptDocument } from "@/app/_actions/library";
import { DocumentFacts, type AnalysisRun } from "@/app/analyze/_components/document-facts";
import { QuestionBox } from "@/app/analyze/_components/question-box";
import { SourceText } from "@/app/analyze/_components/source-text";
import { useReading } from "@/app/analyze/_components/use-reading";
import { ANALYSIS_COPY } from "@/lib/analysis/copy";
import type { StoredDocument } from "@/lib/documents/documents";
import { LIBRARY_COPY } from "@/lib/library/copy";
import type { SavedCheck } from "@/lib/library/library";

const narrowClass =
  "tabular font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft";
const linkClass = "text-[0.9375rem] font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]";

const savedDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** What the facts panel starts with: the saved check, nothing, or an offer to rerun one that didn't verify. */
function initialRun(check: SavedCheck): AnalysisRun {
  if (check.status === "saved") {
    return {
      status: "done",
      analysis: check.analysis,
      redLines: { status: "loaded", redLines: check.redLinesUsed },
      record: { kind: "saved", checkedAt: check.checkedAt },
    };
  }
  if (check.status === "needs-rerun") {
    return { status: "failed", message: LIBRARY_COPY.needsRerun, retryLabel: LIBRARY_COPY.rerun };
  }
  return { status: "idle" };
}

/**
 * A kept document, laid out like /analyze and built from the same components:
 * the facts panel, the question box and the marked source text. The saved
 * check arrives as props; running a new one is an explicit button press.
 */
export function SavedDocument({ document, check }: { document: StoredDocument; check: SavedCheck }) {
  const [run, setRun] = useState<AnalysisRun>(() => initialRun(check));
  const reading = useReading(document.text);

  async function startAnalysis() {
    setRun({ status: "running" });
    reading.clearSelection();
    try {
      const state = await analyzeKeptDocument({ documentId: document.id });
      setRun(
        state.status === "analyzed"
          ? {
              status: "done",
              analysis: state.analysis,
              redLines: state.redLines,
              record: state.saved ? { kind: "saved", checkedAt: state.saved.createdAt } : { kind: "not-saved" },
            }
          : { status: "failed", message: state.message },
      );
    } catch {
      setRun({ status: "failed", message: ANALYSIS_COPY.modelFailed });
    }
  }

  const flags = run.status === "done" ? run.analysis.flags : [];
  const matches = run.status === "done" ? run.analysis.redLineMatches : [];

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-5">
      <section className="border-[3px] border-ink bg-panel-field text-ink lg:col-span-7">
        <header className="px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="barline pb-1.5">
            <h1 className="max-w-[32ch] break-words text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
              {document.title}
            </h1>
          </div>
          <div className="hairline flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pb-3 pt-2">
            <p className={narrowClass}>
              Saved <time dateTime={document.createdAt}>{savedDate.format(new Date(document.createdAt))}</time> ·{" "}
              {wordCount(document.text).toLocaleString("en-US")} words
            </p>
            <Link href="/library" className={linkClass}>
              Back to your library
            </Link>
          </div>
        </header>

        <DocumentFacts
          run={run}
          onStart={() => void startAnalysis()}
          activeKey={reading.selection?.key ?? null}
          onSelect={reading.select}
        />

        <div className="barline-thin" />

        <QuestionBox
          entries={reading.questions}
          onAsk={reading.ask}
          onRetry={reading.retry}
          activeEntryId={reading.activeQuestion}
          activeQuote={reading.activeQuote}
          onSelectQuote={reading.selectQuote}
        />
      </section>

      <SourceText
        text={document.text}
        flags={flags}
        matches={matches}
        answerQuotes={reading.answerQuotes}
        selection={reading.selection}
        onSelect={reading.select}
        className="lg:sticky lg:top-5 lg:col-span-5"
      />
    </div>
  );
}
