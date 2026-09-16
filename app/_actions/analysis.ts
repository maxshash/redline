"use server";

import { runAnalyzeDocument, type AnalyzeState } from "@/lib/analysis/run";
import { modelClientFromEnv } from "@/lib/model/client";

/**
 * Analyse extracted document text. Public: no account or Supabase needed, and
 * nothing is stored. The OpenRouter key stays on the server. The payload is
 * untrusted, so it is validated inside `runAnalyzeDocument`.
 */
export async function analyzeDocumentText(input: { text: string }): Promise<AnalyzeState> {
  return runAnalyzeDocument(input, { model: () => modelClientFromEnv() });
}
