"use client";

import { useState } from "react";
import { DocumentIntake } from "./document-intake";
import { KeepDocument } from "./keep-document";
import { SourceText } from "./source-text";

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

  if (!document) {
    return (
      <DocumentIntake
        onDocument={(next) => {
          setDocument(next);
          setDocumentNumber((n) => n + 1);
        }}
      />
    );
  }

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
              onClick={() => setDocument(null)}
              className="text-[0.9375rem] font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]"
            >
              Use a different document
            </button>
          </div>
        </header>

        <KeepDocument
          key={documentNumber}
          keeping={keeping}
          document={document}
          onTitleChange={(title) => setDocument({ ...document, title })}
        />
      </section>

      <SourceText text={document.text} className="lg:sticky lg:top-5 lg:col-span-5" />
    </div>
  );
}
