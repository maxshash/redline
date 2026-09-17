"use server";

import { revalidatePath } from "next/cache";
import { supabaseDocumentStore } from "@/lib/documents/supabase";
import { analyzeSavedDocument, type AnalyzeSavedState } from "@/lib/library/library";
import { modelClientFromEnv } from "@/lib/model/client";
import { supabaseRedLineStore } from "@/lib/red-lines/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Check a document the signed-in user already keeps, and save the check with
 * it. Only the document id is taken from the payload: the text is read from
 * storage and the red lines from the user's own rows, both on the server.
 */
export async function analyzeKeptDocument(input: { documentId: string }): Promise<AnalyzeSavedState> {
  const supabase = await createSupabaseServerClient();
  const state = await analyzeSavedDocument(input, {
    store: supabase ? supabaseDocumentStore(supabase) : null,
    redLineStore: supabase ? supabaseRedLineStore(supabase) : null,
    model: () => modelClientFromEnv(),
  });
  if (state.status === "analyzed" && state.saved) revalidatePath("/library", "layout");
  return state;
}
