"use client";

import { useRef, useState } from "react";
import { askQuestion } from "@/app/_actions/answer";
import { ANSWER_COPY } from "@/lib/answer/copy";
import { entryCitations, type QuestionEntry } from "./question-box";
import type { FindingKey, Selection } from "./source-text";

/** How many of this session's questions the page keeps on screen. */
const QUESTIONS_KEPT = 10;

/**
 * Reading one document on screen: which finding is selected in the source
 * text, and this session's questions about it. Shared by /analyze and a saved
 * document in the library, so both behave the same. Page state only; nothing
 * here is stored.
 */
export function useReading(text: string) {
  const [selection, setSelection] = useState<Selection | null>(null);
  // This session's questions about the document, newest first.
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);
  // The question whose sentences are marked in the document.
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const nextQuestionId = useRef(1);
  // Bumped by `reset`. An answer that arrives for a document since replaced is dropped.
  const generation = useRef(0);

  function reset() {
    generation.current += 1;
    setSelection(null);
    setQuestions([]);
    setActiveQuestion(null);
  }

  async function ask(question: string, replacing?: number) {
    const asked = generation.current;
    const id = nextQuestionId.current++;
    setQuestions((previous) =>
      [{ id, question, status: "pending" } as QuestionEntry, ...previous.filter((entry) => entry.id !== replacing)].slice(
        0,
        QUESTIONS_KEPT,
      ),
    );

    let next: QuestionEntry;
    try {
      const state = await askQuestion({ text, question });
      next =
        state.status === "answered"
          ? { id, question, status: "done", answer: state.answer }
          : { id, question, status: "failed", message: state.message };
    } catch {
      next = { id, question, status: "failed", message: ANSWER_COPY.modelFailed };
    }
    if (asked !== generation.current) return;
    setQuestions((previous) => previous.map((entry) => (entry.id === id ? next : entry)));
    if (next.status === "done") {
      // The newest answer's sentences are the ones marked, until the reader picks another.
      setActiveQuestion(id);
      setSelection((previous) => (previous?.key.startsWith("quote-") ? null : previous));
    }
  }

  function retry(entryId: number) {
    const entry = questions.find((e) => e.id === entryId);
    if (entry) void ask(entry.question, entryId);
  }

  const select = (key: FindingKey) => setSelection((previous) => ({ key, request: (previous?.request ?? 0) + 1 }));
  const selectQuote = (entryId: number, index: number) => {
    setActiveQuestion(entryId);
    select(`quote-${index}`);
  };
  const activeQuote =
    selection?.key.startsWith("quote-") && activeQuestion !== null ? Number(selection.key.slice("quote-".length)) : null;

  return {
    selection,
    select,
    clearSelection: () => setSelection(null),
    questions,
    ask: (question: string) => void ask(question),
    retry,
    activeQuestion,
    activeQuote,
    selectQuote,
    answerQuotes: entryCitations(questions.find((entry) => entry.id === activeQuestion)),
    reset,
  };
}
