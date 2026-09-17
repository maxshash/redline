import { TEXT_MAX_LENGTH } from "@/lib/documents/documents";

/** The longest question the box accepts. A question, not a second document. */
export const QUESTION_MAX_LENGTH = 500;

/** What a person reads about a question. Safe to import in the browser. */
export const ANSWER_COPY = {
  /** The document doesn't answer the question: the model said so. */
  notInDocument: "Nothing in this document answers that.",
  /** The model gave an answer, but none of its quotes are in the document. */
  noVerifiedQuote: "Redline couldn't find sentences in the document to back an answer, so it isn't giving one.",
  /** The model gave an answer with a figure or quote its sentences don't contain. */
  unsupportedDetail: "Redline's answer included details the document doesn't state, so it isn't shown.",

  missingText: "There's no document text to ask about.",
  longText: `This document is too long to ask about. The limit is ${TEXT_MAX_LENGTH.toLocaleString("en-US")} characters.`,
  missingQuestion: "Type a question first.",
  longQuestion: `Questions can be up to ${QUESTION_MAX_LENGTH} characters. Try a shorter one.`,
  notConfigured: "Questions aren't set up on this server yet, so Redline can't answer this one.",
  modelFailed: "Redline couldn't answer that just now. Try again in a minute.",
  invalidOutput: "Redline got back an answer it couldn't check against your document, so it isn't shown. Try again.",
} as const;
