import { TEXT_MAX_LENGTH } from "@/lib/documents/documents";
import { ModelConfigError, type ModelClient } from "@/lib/model/client";
import { AnalysisError, analyzeDocument } from "./analyze";
import { ANALYSIS_COPY } from "./copy";
import type { Analysis } from "./types";

export { ANALYSIS_COPY } from "./copy";

/**
 * The server action's own logic, with the model injected. The action is
 * public: it works signed out and with Supabase absent, and stores nothing.
 */

export type AnalyzeFailure = "not-configured" | "model-failed" | "invalid-output";

export type AnalyzeState =
  | { status: "analyzed"; analysis: Analysis }
  | { status: "invalid"; message: string }
  | { status: "error"; reason: AnalyzeFailure; message: string };

export interface RunAnalyzeDeps {
  /** Build the model client. Throws `ModelConfigError` when the key or model is missing. */
  model: () => ModelClient;
  /** Where failures are reported for whoever runs the server. Defaults to console.error. */
  log?: (message: string) => void;
}

export type AnalyzeValidation = { ok: true; text: string } | { ok: false; message: string };

/** Check an untrusted payload. The text is kept exactly as sent, because citations index into it. */
export function validateAnalyzeInput(input: unknown): AnalyzeValidation {
  const record = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const text = typeof record.text === "string" ? record.text : "";
  if (text.trim().length === 0) return { ok: false, message: ANALYSIS_COPY.missingText };
  if (text.length > TEXT_MAX_LENGTH) return { ok: false, message: ANALYSIS_COPY.longText };
  return { ok: true, text };
}

export async function runAnalyzeDocument(input: unknown, deps: RunAnalyzeDeps): Promise<AnalyzeState> {
  const log = deps.log ?? ((message: string) => console.error(message));
  const validation = validateAnalyzeInput(input);
  if (!validation.ok) return { status: "invalid", message: validation.message };

  let model: ModelClient;
  try {
    model = deps.model();
  } catch (error) {
    if (error instanceof ModelConfigError) {
      log(`[analyze] ${error.message}`);
      return { status: "error", reason: "not-configured", message: ANALYSIS_COPY.notConfigured };
    }
    log(`[analyze] could not create the model client: ${describe(error)}`);
    return { status: "error", reason: "model-failed", message: ANALYSIS_COPY.modelFailed };
  }

  try {
    const analysis = await analyzeDocument(validation.text, { model, log });
    return { status: "analyzed", analysis };
  } catch (error) {
    if (error instanceof AnalysisError && error.kind === "invalid-output") {
      log(`[analyze] ${error.message}`);
      return { status: "error", reason: "invalid-output", message: ANALYSIS_COPY.invalidOutput };
    }
    const cause = error instanceof AnalysisError ? error.cause : error;
    log(`[analyze] model call failed: ${describe(cause)}`);
    return { status: "error", reason: "model-failed", message: ANALYSIS_COPY.modelFailed };
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const kind = "kind" in error ? ` (${String((error as { kind: unknown }).kind)})` : "";
    return `${error.name}${kind}: ${error.message}`;
  }
  return String(error);
}
