import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentStore, NewDocument, SavedDocument } from "./documents";

interface DocumentRow {
  id: string;
  title: string;
  created_at: string;
}

const SUMMARY_COLUMNS = "id, title, created_at";

function toSaved(row: DocumentRow): SavedDocument {
  return { id: row.id, title: row.title, createdAt: row.created_at };
}

/**
 * The documents store backed by a request-scoped Supabase client. Every query
 * runs as the signed-in user, so row-level security decides what is visible.
 */
export function supabaseDocumentStore(supabase: SupabaseClient): DocumentStore {
  return {
    async currentUserId() {
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data?.claims?.sub) return null;
      return data.claims.sub;
    },

    async insert(document: NewDocument) {
      const payload: NewDocument = { title: document.title, text: document.text };
      const { data, error } = await supabase
        .from("documents")
        .insert(payload)
        .select(SUMMARY_COLUMNS)
        .single<DocumentRow>();
      if (error || !data) return null;
      return toSaved(data);
    },

    async listForUser(userId: string) {
      // Row-level security already limits rows to this user; the filter lets
      // Postgres use the (user_id, created_at) index.
      const { data, error } = await supabase
        .from("documents")
        .select(SUMMARY_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error || !data) return null;
      return (data as DocumentRow[]).map(toSaved);
    },
  };
}
