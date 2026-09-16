"use client";

import { useRef, useState } from "react";
import { titleFromFileName, titleFromText } from "@/lib/documents/documents";
import { extractTextFromFile } from "@/lib/extraction/browser";
import { EXTRACTION_COPY, type ExtractionResult } from "@/lib/extraction/extract";
import { normalizeExtractedText } from "@/lib/extraction/normalize";
import type { DocumentInHand } from "./analyze-workspace";

const ACCEPT = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
].join(",");

const subheadClass = "text-[0.9375rem] font-bold uppercase leading-[1.2] tracking-[0.06em]";
const hintClass = "max-w-[52ch] pt-1.5 text-[0.9375rem] leading-[1.55] text-ink-soft";
const buttonClass =
  "inline-block cursor-pointer border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field";

type Problem = { fileName: string | null; message: string };

/**
 * Bring a document in: pick a file or paste text. Files are read in this
 * browser tab. The file input sits outside any form and has no name, so
 * nothing about the file can be submitted anywhere.
 */
export function DocumentIntake({ onDocument }: { onDocument: (document: DocumentInHand) => void }) {
  const [reading, setReading] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [pasted, setPasted] = useState("");
  // Only the latest attempt may finish; a slow earlier file must not win.
  const attempt = useRef(0);

  async function readFile(file: File) {
    const id = ++attempt.current;
    setProblem(null);
    setReading(file.name);

    let result: ExtractionResult;
    try {
      result = await extractTextFromFile(file);
    } catch {
      result = { ok: false, reason: "unreadable", message: EXTRACTION_COPY.unreadable };
    }
    if (id !== attempt.current) return;
    setReading(null);

    if (!result.ok) {
      setProblem({ fileName: file.name, message: result.message });
      return;
    }
    onDocument({ title: titleFromFileName(file.name), text: result.text, source: { kind: "file", name: file.name } });
  }

  function submitPastedText(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    attempt.current++;
    setReading(null);
    const text = normalizeExtractedText(pasted);
    if (text.length === 0) {
      setProblem({ fileName: null, message: "Paste the document's text into the box first." });
      return;
    }
    onDocument({ title: titleFromText(text), text, source: { kind: "paste" } });
  }

  return (
    <section className="border-[3px] border-ink bg-panel-field px-5 py-6 text-ink sm:px-8 sm:py-8">
      <div className="barline pb-1.5">
        <h1 className="text-[1.625rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] sm:text-[2rem]">
          Check a document
        </h1>
      </div>
      <p className="max-w-[64ch] pt-3.5 text-[1rem] leading-[1.55] text-ink-soft">
        Choose a contract, lease, freelance agreement or terms of service, or paste its text. Your browser
        opens the file and pulls out the text. The file itself isn&apos;t uploaded.
      </p>

      <div aria-live="polite" className="empty:hidden">
        {reading && (
          <p role="status" className="mt-6 border-[3px] border-ink px-4 py-3 text-[1rem] font-bold leading-[1.45]">
            Reading <span className="break-all">{reading}</span>…
          </p>
        )}
        {problem && (
          <div role="alert" className="mt-6 max-w-[68ch] border-[3px] border-ink px-4 py-3">
            {problem.fileName && (
              <p className="break-all font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
                {problem.fileName}
              </p>
            )}
            <p className="pt-0.5 text-[1rem] font-bold leading-[1.45]">{problem.message}</p>
          </div>
        )}
      </div>

      <div className="mt-7 grid gap-x-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="border-t-[3px] border-ink pt-4">
          <h2 className={subheadClass}>From a file</h2>
          <p className={hintClass}>
            PDF, Word (.docx), plain text or Markdown. Scans and photos won&apos;t work, because Redline only quotes
            text it can read exactly.
          </p>
          <div className="pt-5">
            <input
              id="document-file"
              type="file"
              accept={ACCEPT}
              className="peer sr-only"
              disabled={reading !== null}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                // Clear the input so choosing the same file again still fires.
                event.currentTarget.value = "";
                if (file) void readFile(file);
              }}
            />
            <label
              htmlFor="document-file"
              className={`${buttonClass} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-critical peer-disabled:cursor-wait peer-disabled:bg-ink peer-disabled:text-panel-field`}
            >
              {reading ? "Reading…" : "Choose a file"}
            </label>
          </div>
        </div>

        <form onSubmit={submitPastedText} className="mt-8 border-t-[3px] border-ink pt-4 lg:mt-0">
          <label htmlFor="document-text" className={`block ${subheadClass}`}>
            Or paste the text
          </label>
          <textarea
            id="document-text"
            value={pasted}
            onChange={(event) => setPasted(event.currentTarget.value)}
            rows={10}
            spellCheck={false}
            className="mt-3 block w-full resize-y border-[3px] border-ink bg-panel-field px-3 py-2.5 font-[family-name:var(--font-source)] text-[0.9375rem] leading-[1.7] text-ink"
          />
          <button type="submit" className={`${buttonClass} mt-4`}>
            Use this text
          </button>
        </form>
      </div>
    </section>
  );
}
