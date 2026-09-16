"use server";

import { runAnalyzeDocument, type AnalyzeState } from "@/lib/analysis/run";
import { modelClientFromEnv } from "@/lib/model/client";
import { supabaseRedLineStore } from "@/lib/red-lines/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Analyse extracted document text. Public: no account or Supabase needed, and
 * nothing is stored. The OpenRouter key stays on the server. The payload is
 * untrusted, so it is validated inside `runAnalyzeDocument`. Only its text is
 * used: red lines come from the signed-in user's own rows, read here.
 */
export async function analyzeDocumentText(input: { text: string }): Promise<AnalyzeState> {
  const supabase = await createSupabaseServerClient();
  return runAnalyzeDocument(input, {
    model: () => modelClientFromEnv(),
    redLineStore: supabase ? supabaseRedLineStore(supabase) : null,
  });
}
