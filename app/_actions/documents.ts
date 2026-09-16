"use server";

import { revalidatePath } from "next/cache";
import { runSaveDocument, type SaveDocumentState } from "@/lib/documents/documents";
import { supabaseDocumentStore } from "@/lib/documents/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Keep a document in the signed-in user's library. Takes only a title and the
 * extracted text; the original file is never sent here. The payload is
 * untrusted, so it is validated inside `runSaveDocument`.
 */
export async function saveDocument(input: { title: string; text: string }): Promise<SaveDocumentState> {
  const supabase = await createSupabaseServerClient();
  const state = await runSaveDocument(input, supabase ? supabaseDocumentStore(supabase) : null);
  if (state.status === "saved") revalidatePath("/library");
  return state;
}
