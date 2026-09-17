"use client";

import { useRef, useState } from "react";
import { analyzeDocumentText } from "@/app/_actions/analysis";
import { analyzeKeptDocument } from "@/app/_actions/library";
import { ANALYSIS_COPY } from "@/lib/analysis/copy";
import { serializeAnalysis, serializeRedLinesUsed } from "@/lib/analysis/stored";
import type { SavedDocument } from "@/lib/documents/documents";
import { DocumentFacts, type AnalysisRun } from "./document-facts";
import { DocumentIntake } from "./document-intake";
import { KeepDocument, type LaterCheck } from "./keep-document";
import { QuestionBox } from "./question-box";
import { SourceText } from "./source-text";
import { useReading } from "./use-reading";

/** Whether this visitor can keep documents, decided on the server. */
export type Keeping = "signed-in" | "signed-out" | "unavailable";

/**
 * The document the page is working on: its title and extracted text, and
 * where the text came from. Only text is held; the picked file is gone once
 * it has been read.
 */
export interface DocumentInHand {
  title: string;
  text: string;
  source: { kind: "file"; name: string } | { kind: "paste" };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function AnalyzeWorkspace({ keeping }: { keeping: Keeping }) {
  const [document, setDocument] = useState<DocumentInHand | null>(null);
  // Bumped for each new document so per-document state (like "saved") resets.
  const [documentNumber, setDocumentNumber] = useState(0);
  const [run, setRun] = useState<AnalysisRun>({ status: "idle" });
  // The library copy of the document in hand, once the reader has saved it.
  // A check run after that is stored with it on the server.
  const [kept, setKept] = useState<SavedDocument | null>(null);
  const [laterCheck, setLaterCheck] = useState<LaterCheck>(null);
  const reading = useReading(document?.text ?? "");
  // The document an in-flight analysis belongs to. A result for a document
  // that has since been replaced is dropped.
  const current = useRef(0);

  function replaceDocument(next: DocumentInHand | null) {
    current.current += 1;
    setDocument(next);
    setDocumentNumber((n) => n + 1);
    setRun({ status: "idle" });
    setKept(null);
    setLaterCheck(null);
    reading.reset();
  }

  async function startAnalysis(text: string) {
    const id = current.current;
    setRun({ status: "running" });
    reading.clearSelection();
    let next: AnalysisRun;
    let stored: LaterCheck = null;
    try {
      if (kept) {
        const state = await analyzeKeptDocument({ documentId: kept.id });
        if (state.status === "analyzed") {
          next = { status: "done", analysis: state.analysis, redLines: state.redLines };
          stored = state.saved ? "saved" : "not-saved";
        } else {
          next = { status: "failed", message: state.message };
        }
      } else {
        const state = await analyzeDocumentText({ text });
        next =
          state.status === "analyzed"
            ? { status: "done", analysis: state.analysis, redLines: state.redLines }
            : { status: "failed", message: state.message };
      }
    } catch {
      next = { status: "failed", message: ANALYSIS_COPY.modelFailed };
    }
    if (id !== current.current) return;
    setRun(next);
    if (stored) setLaterCheck(stored);
  }

  if (!document) {
    return <DocumentIntake onDocument={replaceDocument} />;
  }

  const flags = run.status === "done" ? run.analysis.flags : [];
  const matches = run.status === "done" ? run.analysis.redLineMatches : [];
  // What saving sends when the document has already been checked: the check
  // as it will be stored, re-verified against the text on the server.
  const checkToKeep =
    run.status === "done"
      ? {
          result: serializeAnalysis(run.analysis),
          redLinesUsed: serializeRedLinesUsed(run.redLines.status === "loaded" ? run.redLines.redLines : []),
        }
      : null;

  const origin = document.source.kind === "file" ? `From ${document.source.name}` : "Pasted text";

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-5">
      <section className="border-[3px] border-ink bg-panel-field text-ink lg:col-span-7">
        <header className="px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="barline pb-1.5">
            <h1 className="max-w-[32ch] break-words text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
              {document.title || "Untitled document"}
            </h1>
          </div>
          <div className="hairline flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pb-3 pt-2">
            <p className="tabular break-all font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
              {origin} · {wordCount(document.text).toLocaleString("en-US")} words
            </p>
            <button
              type="button"
              onClick={() => replaceDocument(null)}
              className="text-[0.9375rem] font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]"
            >
              Use a different document
            </button>
          </div>
        </header>

        <DocumentFacts
          run={run}
          onStart={() => void startAnalysis(document.text)}
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

        <div className="barline-thin" />

        <KeepDocument
          key={documentNumber}
          keeping={keeping}
          document={document}
          onTitleChange={(title) => setDocument({ ...document, title })}
          checkToKeep={checkToKeep}
          checkRunning={run.status === "running"}
          laterCheck={laterCheck}
          onSaved={setKept}
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
