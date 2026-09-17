"use client";

import { useState } from "react";
import { ANSWER_COPY, QUESTION_MAX_LENGTH } from "@/lib/answer/copy";
import type { Answer } from "@/lib/answer/types";
import type { Citation } from "@/lib/citations/citation";

/** One question asked this session, kept in page state only. */
export type QuestionEntry =
  | { id: number; question: string; status: "pending" }
  | { id: number; question: string; status: "failed"; message: string }
  | { id: number; question: string; status: "done"; answer: Answer };

/** The citations an entry puts in the source document: an answer's sentences, or the closest ones. */
export function entryCitations(entry: QuestionEntry | undefined): readonly Citation[] {
  if (!entry || entry.status !== "done") return [];
  return entry.answer.kind === "answered" ? entry.answer.citations : entry.answer.related;
}

export const QUESTION_COPY = {
  heading: "Questions",
  intro:
    "Ask anything about this document. Answers come only from its text and quote the sentences they're based on. When the document doesn't say, Redline tells you.",
  label: "Your question",
  placeholder: "How long does the client have to pay an invoice?",
  ask: "Ask",
  asking: "Asking…",
  pending: "Looking through the document…",
  answeredTag: "Answered from your document",
  citationsLabel: "Where it says so",
  notInDocumentTag: "Not in your document",
  relatedLabel: "The closest it gets",
  retry: "Ask again",
} as const;

const labelClass = "text-[0.9375rem] font-bold uppercase tracking-[0.06em]";
const narrowClass = "font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft";
const bodyClass = "max-w-[62ch] pt-1.5 text-[1rem] leading-[1.55] text-ink-soft";
const buttonClass =
  "inline-block cursor-pointer border-[3px] border-ink bg-carton px-6 py-3 text-[0.9375rem] font-extrabold uppercase tracking-[0.08em] text-carton-ink transition-colors hover:bg-ink hover:text-panel-field disabled:cursor-wait disabled:bg-ink disabled:text-panel-field";
const linkButtonClass =
  "cursor-pointer text-[0.9375rem] font-bold text-ink underline decoration-1 underline-offset-[3px] hover:decoration-[3px]";

/**
 * The question box. Its answers carry a different guarantee from warnings:
 * they restate what quoted sentences say and judge nothing. So they are drawn
 * with their own device, a double ink rule, with no tier, no colour and no
 * overprint, and each quoted sentence is set in full in the source voice.
 */
export function QuestionBox({
  entries,
  onAsk,
  onRetry,
  activeEntryId,
  activeQuote,
  onSelectQuote,
}: {
  /** Newest first. */
  entries: readonly QuestionEntry[];
  onAsk: (question: string) => void;
  /** Ask a failed entry's question again, in place of that entry. */
  onRetry: (entryId: number) => void;
  /** The entry whose citations are marked in the document. */
  activeEntryId: number | null;
  /** The selected citation of the active entry, by index. */
  activeQuote: number | null;
  onSelectQuote: (entryId: number, index: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const pending = entries.some((entry) => entry.status === "pending");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (question.length === 0) return setProblem(ANSWER_COPY.missingQuestion);
    if (question.length > QUESTION_MAX_LENGTH) return setProblem(ANSWER_COPY.longQuestion);
    setProblem(null);
    setDraft("");
    onAsk(question);
  }

  return (
    <section className="px-5 pb-6 pt-5 sm:px-7" aria-labelledby="questions-heading">
      <div className="barline pb-1.5">
        <h2
          id="questions-heading"
          className="text-[1.625rem] font-extrabold uppercase leading-[0.9] tracking-[-0.01em] sm:text-[2rem]"
        >
          {QUESTION_COPY.heading}
        </h2>
      </div>
      <p className={`${bodyClass} pt-3`}>{QUESTION_COPY.intro}</p>

      <form onSubmit={submit} className="pt-4">
        <label htmlFor="question" className={`block ${labelClass}`}>
          {QUESTION_COPY.label}
        </label>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-stretch">
          <textarea
            id="question"
            name="question"
            rows={2}
            value={draft}
            maxLength={QUESTION_MAX_LENGTH}
            placeholder={QUESTION_COPY.placeholder}
            aria-invalid={problem !== null}
            aria-describedby={problem ? "question-problem" : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="min-h-[3.25rem] w-full resize-y border-[3px] border-ink bg-panel-field px-3 py-2 text-[1rem] leading-[1.45] text-ink placeholder:text-ink-soft"
          />
          <button type="submit" disabled={pending} className={`${buttonClass} shrink-0`}>
            {pending ? QUESTION_COPY.asking : QUESTION_COPY.ask}
          </button>
        </div>
        {problem && (
          <p id="question-problem" role="alert" className="pt-2 text-[0.9375rem] font-bold leading-[1.45] text-ink">
            {problem}
          </p>
        )}
      </form>

      {entries.length > 0 && (
        <ol className="pt-6" aria-live="polite">
          {entries.map((entry, i) => (
            <li key={entry.id} className={i > 0 ? "pt-5" : undefined}>
              <EntryBlock
                entry={entry}
                active={entry.id === activeEntryId}
                activeQuote={entry.id === activeEntryId ? activeQuote : null}
                onSelectQuote={(index) => onSelectQuote(entry.id, index)}
                onRetry={() => onRetry(entry.id)}
                retryDisabled={pending}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EntryBlock({
  entry,
  active,
  activeQuote,
  onSelectQuote,
  onRetry,
  retryDisabled,
}: {
  entry: QuestionEntry;
  active: boolean;
  activeQuote: number | null;
  onSelectQuote: (index: number) => void;
  onRetry: () => void;
  retryDisabled: boolean;
}) {
  return (
    <article className="print-set rule-answer px-4 pb-2 pt-3" aria-current={active ? "true" : undefined}>
      <p className="max-w-[62ch] whitespace-pre-line break-words text-[1.0625rem] font-bold leading-[1.4] text-ink">
        {entry.question}
      </p>

      {entry.status === "pending" && (
        <p role="status" className={`${bodyClass} pb-2`}>
          {QUESTION_COPY.pending}
        </p>
      )}

      {entry.status === "failed" && (
        <div className="pb-2">
          <p role="alert" className="max-w-[62ch] pt-1.5 text-[1rem] font-bold leading-[1.45] text-ink">
            {entry.message}
          </p>
          <button type="button" onClick={onRetry} disabled={retryDisabled} className={`${linkButtonClass} mt-2 disabled:cursor-wait`}>
            {QUESTION_COPY.retry}
          </button>
        </div>
      )}

      {entry.status === "done" && entry.answer.kind === "answered" && (
        <>
          <p className={`${narrowClass} pt-2`}>{QUESTION_COPY.answeredTag}</p>
          <p className="max-w-[62ch] whitespace-pre-line break-words pt-1 text-[1rem] leading-[1.55] text-ink">
            {entry.answer.answer}
          </p>
          <CitationList
            label={QUESTION_COPY.citationsLabel}
            citations={entry.answer.citations}
            activeQuote={activeQuote}
            onSelect={onSelectQuote}
          />
        </>
      )}

      {entry.status === "done" && entry.answer.kind === "not-in-document" && (
        <>
          <p className={`${labelClass} pt-2 text-ink`}>{QUESTION_COPY.notInDocumentTag}</p>
          <p className="max-w-[62ch] pt-1 text-[1rem] leading-[1.55] text-ink">{entry.answer.message}</p>
          {entry.answer.related.length > 0 ? (
            <CitationList
              label={QUESTION_COPY.relatedLabel}
              citations={entry.answer.related}
              activeQuote={activeQuote}
              onSelect={onSelectQuote}
            />
          ) : (
            <div className="pb-2" />
          )}
        </>
      )}
    </article>
  );
}

/** Each quoted sentence in full, in the source document's own voice. Selecting one finds it in the document. */
function CitationList({
  label,
  citations,
  activeQuote,
  onSelect,
}: {
  label: string;
  citations: readonly Citation[];
  activeQuote: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="pt-3">
      <p className={narrowClass}>{label}</p>
      <ul className="pt-1">
        {citations.map((citation, index) => (
          <li key={`${citation.start}:${citation.end}`} className="border-t border-ink first:border-t-0">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-pressed={activeQuote === index}
              className={`-mx-2 block w-[calc(100%+1rem)] cursor-pointer px-2 py-2.5 text-left transition-colors ${
                activeQuote === index ? "bg-panel-field-active" : "hover:bg-panel-field-hover"
              }`}
            >
              <span className="block whitespace-pre-line break-words font-[family-name:var(--font-source)] text-[1rem] leading-[1.45] sm:text-[1.0625rem]">
                &ldquo;{citation.text}&rdquo;
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
