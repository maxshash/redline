import { TEXT_MAX_LENGTH } from "@/lib/documents/documents";
import { loadRedLinesForAnalysis, type RedLineStore, type RedLinesForAnalysis } from "@/lib/red-lines/red-lines";
import { ModelConfigError, type ModelClient } from "@/lib/model/client";
import { AnalysisError, analyzeDocument, redLinesToSend } from "./analyze";
import { ANALYSIS_COPY } from "./copy";
import type { Analysis, RedLineRef } from "./types";

export { ANALYSIS_COPY } from "./copy";

/**
 * The server action's own logic, with the model and the red lines store
 * injected. The action is public: it works signed out and with Supabase
 * absent, and stores nothing.
 */

export type AnalyzeFailure = "not-configured" | "model-failed" | "invalid-output";

/**
 * Which red lines the analysis ran with, as the result screen needs to know:
 * the ones checked, or why none were. A saved analysis stores the list.
 */
export type RedLinesUsed =
  | { status: "loaded"; redLines: RedLineRef[] }
  | { status: "signed-out" }
  | { status: "unavailable" }
  | { status: "failed" };

export type AnalyzeState =
  | { status: "analyzed"; analysis: Analysis; redLines: RedLinesUsed }
  | { status: "invalid"; message: string }
  | { status: "error"; reason: AnalyzeFailure; message: string };

export interface RunAnalyzeDeps {
  /** Build the model client. Throws `ModelConfigError` when the key or model is missing. */
  model: () => ModelClient;
  /**
   * The signed-in user's red lines, read on the server. Null when Supabase
   * isn't configured. Red lines in the payload are never used.
   */
  redLineStore: RedLineStore | null;
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

  const loaded = await loadRedLinesSafely(deps.redLineStore, log);

  try {
    const analysis = await analyzeDocument(validation.text, loaded.redLines, { model, log });
    return { status: "analyzed", analysis, redLines: redLinesUsed(loaded) };
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

/** A failed read of the red lines shouldn't stop the document being read. */
async function loadRedLinesSafely(store: RedLineStore | null, log: (message: string) => void): Promise<RedLinesForAnalysis> {
  try {
    const loaded = await loadRedLinesForAnalysis(store);
    if (loaded.status === "failed") log("[analyze] could not load the user's red lines; analysing without them");
    return loaded;
  } catch (error) {
    log(`[analyze] could not load the user's red lines: ${describe(error)}`);
    return { status: "failed", redLines: [] };
  }
}

function redLinesUsed(loaded: RedLinesForAnalysis): RedLinesUsed {
  return loaded.status === "loaded" ? { status: "loaded", redLines: redLinesToSend(loaded.redLines) } : { status: loaded.status };
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const kind = "kind" in error ? ` (${String((error as { kind: unknown }).kind)})` : "";
    return `${error.name}${kind}: ${error.message}`;
  }
  return String(error);
}
