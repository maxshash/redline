"use server";

import { revalidatePath } from "next/cache";
import { runSaveDocument, type SaveDocumentState } from "@/lib/documents/documents";
import { supabaseDocumentStore } from "@/lib/documents/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Keep a document in the signed-in user's library. Takes a title, the
 * extracted text and, if the reader already checked it, that analysis with
 * the red lines it ran with; the original file is never sent here. The payload
 * is untrusted: `runSaveDocument` validates it and re-checks every citation in
 * the analysis against the text before anything is stored.
 */
export async function saveDocument(input: {
  title: string;
  text: string;
  analysis?: { result: unknown; redLinesUsed: unknown };
}): Promise<SaveDocumentState> {
  const supabase = await createSupabaseServerClient();
  const state = await runSaveDocument(input, supabase ? supabaseDocumentStore(supabase) : null);
  if (state.status === "saved") revalidatePath("/library");
  return state;
}
