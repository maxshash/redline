import { locateCitation, type Citation } from "@/lib/citations/citation";
import { checkSupport } from "@/lib/citations/support";
import type { ModelClient } from "@/lib/model/client";
import { ANSWER_COPY, QUESTION_MAX_LENGTH } from "./copy";
import { ANSWER_SCHEMA, ANSWER_SCHEMA_NAME, ANSWER_STATUSES, ANSWER_SYSTEM_PROMPT, answerUserMessage } from "./prompt";
import type { Answer, AnswerVerification, DowngradeReason } from "./types";

export type AnswerErrorKind =
  /** There was no document text, no question, or the question is too long. */
  | "invalid-input"
  /** The model call itself failed: network, OpenRouter error, non-JSON content, or a throw. */
  | "model-failed"
  /** The model answered, but not with a status, an answer and a quotes list. */
  | "invalid-output";

export class AnswerError extends Error {
  readonly kind: AnswerErrorKind;

  constructor(kind: AnswerErrorKind, message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "AnswerError";
    this.kind = kind;
  }
}

export interface AnswerDeps {
  model: ModelClient;
}

/**
 * Answer a question about `text` from `text` alone.
 *
 * There is deliberately nothing else to pass: no red lines, no analysis. The
 * model is sent the document and the question and nothing more.
 *
 * The model's output is untrusted. Every quote has to be found in `text`
 * (`locateCitation`); quotes that aren't are dropped and counted. Then:
 * - "answered" with no surviving citation becomes "not-in-document";
 * - "answered" whose answer names a figure or quotes a phrase that none of its
 *   citations contain becomes "not-in-document", and its verified citations
 *   are kept as the sentences that come closest;
 * - "not-in-document" never carries the model's wording. Its message is
 *   Redline's own, so a claim can't slip through as the answer.
 *
 * `text` is passed to the model unchanged, and citations index into it.
 */
export async function answerQuestion(text: string, question: string, deps: AnswerDeps): Promise<Answer> {
  if (text.trim().length === 0) throw new AnswerError("invalid-input", "There is no document text to ask about.");
  const asked = question.trim();
  if (asked.length === 0) throw new AnswerError("invalid-input", "There is no question.");
  if (asked.length > QUESTION_MAX_LENGTH) throw new AnswerError("invalid-input", "The question is too long.");

  let output: unknown;
  try {
    output = await deps.model.completeJson({
      name: ANSWER_SCHEMA_NAME,
      system: ANSWER_SYSTEM_PROMPT,
      user: answerUserMessage(text, asked),
      schema: ANSWER_SCHEMA,
    });
  } catch (cause) {
    throw new AnswerError("model-failed", "The model call failed.", { cause });
  }

  if (!isRecord(output)) throw new AnswerError("invalid-output", "The model's output was not a JSON object.");
  const status = ANSWER_STATUSES.find((s) => s === output.status);
  if (!status) throw new AnswerError("invalid-output", "The model's output had no valid status.");
  if (typeof output.answer !== "string") throw new AnswerError("invalid-output", "The model's output had no answer.");
  if (!Array.isArray(output.quotes)) throw new AnswerError("invalid-output", "The model's output had no quotes list.");
  const answerText = output.answer.trim();
  if (status === "answered" && answerText.length === 0) {
    throw new AnswerError("invalid-output", "The model said it answered but gave no answer.");
  }

  const verification: AnswerVerification = {
    quotesProposed: output.quotes.length,
    quotesKept: 0,
    quotesDropped: 0,
    quotesDuplicate: 0,
    downgraded: false,
    downgradeReason: null,
  };

  const bySpan = new Map<string, Citation>();
  for (const quote of output.quotes) {
    const citation = typeof quote === "string" ? locateCitation(text, quote) : null;
    if (!citation) {
      verification.quotesDropped++;
      continue;
    }
    const key = `${citation.start}:${citation.end}`;
    if (bySpan.has(key)) {
      verification.quotesDuplicate++;
      continue;
    }
    bySpan.set(key, citation);
  }
  const citations = [...bySpan.values()].sort((a, b) => a.start - b.start || a.end - b.end);
  verification.quotesKept = citations.length;

  if (status === "not-in-document") {
    return { kind: "not-in-document", message: ANSWER_COPY.notInDocument, related: citations, verification };
  }

  if (!isNonEmpty(citations)) return downgrade("no-verified-quote", citations, verification);
  if (!checkSupport(answerText, citations.map((c) => c.text)).supported) {
    return downgrade("unsupported-detail", citations, verification);
  }
  return { kind: "answered", answer: answerText, citations, verification };
}

function downgrade(reason: DowngradeReason, related: Citation[], verification: AnswerVerification): Answer {
  return {
    kind: "not-in-document",
    message: reason === "no-verified-quote" ? ANSWER_COPY.noVerifiedQuote : ANSWER_COPY.unsupportedDetail,
    related,
    verification: { ...verification, downgraded: true, downgradeReason: reason },
  };
}

function isNonEmpty<T>(list: T[]): list is [T, ...T[]] {
  return list.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
