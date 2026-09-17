import { TEXT_MAX_LENGTH } from "@/lib/documents/documents";
import { ModelConfigError, type ModelClient } from "@/lib/model/client";
import { AnswerError, answerQuestion } from "./answer";
import { ANSWER_COPY, QUESTION_MAX_LENGTH } from "./copy";
import type { Answer } from "./types";

export { ANSWER_COPY, QUESTION_MAX_LENGTH } from "./copy";

/**
 * The question-box server action's own logic, with the model injected. The
 * action is public: it works signed out and with Supabase absent, and stores
 * nothing. It takes no red lines and no analysis, and ignores any sent.
 */

export type AskFailure = "not-configured" | "model-failed" | "invalid-output";

export type AskState =
  | { status: "answered"; answer: Answer }
  | { status: "invalid"; message: string }
  | { status: "error"; reason: AskFailure; message: string };

export interface RunAskDeps {
  /** Build the model client. Throws `ModelConfigError` when the key or model is missing. */
  model: () => ModelClient;
  /** Where failures are reported for whoever runs the server. Defaults to console.error. */
  log?: (message: string) => void;
}

export type AskValidation = { ok: true; text: string; question: string } | { ok: false; message: string };

/**
 * Check an untrusted payload. The text is kept exactly as sent, because
 * citations index into it; the question is trimmed.
 */
export function validateAskInput(input: unknown): AskValidation {
  const record = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const text = typeof record.text === "string" ? record.text : "";
  const question = typeof record.question === "string" ? record.question.trim() : "";
  if (text.trim().length === 0) return { ok: false, message: ANSWER_COPY.missingText };
  if (text.length > TEXT_MAX_LENGTH) return { ok: false, message: ANSWER_COPY.longText };
  if (question.length === 0) return { ok: false, message: ANSWER_COPY.missingQuestion };
  if (question.length > QUESTION_MAX_LENGTH) return { ok: false, message: ANSWER_COPY.longQuestion };
  return { ok: true, text, question };
}

export async function runAskQuestion(input: unknown, deps: RunAskDeps): Promise<AskState> {
  const log = deps.log ?? ((message: string) => console.error(message));
  const validation = validateAskInput(input);
  if (!validation.ok) return { status: "invalid", message: validation.message };

  let model: ModelClient;
  try {
    model = deps.model();
  } catch (error) {
    if (error instanceof ModelConfigError) {
      log(`[ask] ${error.message}`);
      return { status: "error", reason: "not-configured", message: ANSWER_COPY.notConfigured };
    }
    log(`[ask] could not create the model client: ${describe(error)}`);
    return { status: "error", reason: "model-failed", message: ANSWER_COPY.modelFailed };
  }

  try {
    const answer = await answerQuestion(validation.text, validation.question, { model });
    if (answer.verification.downgraded || answer.verification.quotesDropped > 0) {
      log(`[ask] answer checked: ${JSON.stringify(answer.verification)}`);
    }
    return { status: "answered", answer };
  } catch (error) {
    if (error instanceof AnswerError && error.kind === "invalid-output") {
      log(`[ask] ${error.message}`);
      return { status: "error", reason: "invalid-output", message: ANSWER_COPY.invalidOutput };
    }
    const cause = error instanceof AnswerError ? (error.cause ?? error) : error;
    log(`[ask] model call failed: ${describe(cause)}`);
    return { status: "error", reason: "model-failed", message: ANSWER_COPY.modelFailed };
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const kind = "kind" in error ? ` (${String((error as { kind: unknown }).kind)})` : "";
    return `${error.name}${kind}: ${error.message}`;
  }
  return String(error);
}
