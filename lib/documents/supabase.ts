import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisRecord } from "@/lib/analysis/stored";
import type {
  DocumentStore,
  NewDocument,
  SavedDocument,
  StoredAnalysisRow,
  StoredDocument,
} from "./documents";

interface DocumentRow {
  id: string;
  title: string;
  created_at: string;
}

interface FullDocumentRow extends DocumentRow {
  text: string;
}

interface AnalysisRow {
  id: string;
  result: unknown;
  red_lines_used: unknown;
  created_at: string;
}

const SUMMARY_COLUMNS = "id, title, created_at";
const FULL_COLUMNS = "id, title, text, created_at";
const ANALYSIS_COLUMNS = "id, result, red_lines_used, created_at";

function toSaved(row: DocumentRow): SavedDocument {
  return { id: row.id, title: row.title, createdAt: row.created_at };
}

function toStoredDocument(row: FullDocumentRow): StoredDocument {
  return { id: row.id, title: row.title, text: row.text, createdAt: row.created_at };
}

function toAnalysisRow(row: AnalysisRow): StoredAnalysisRow {
  return { id: row.id, result: row.result, redLinesUsed: row.red_lines_used, createdAt: row.created_at };
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

    async listWithLatestAnalysis(userId: string) {
      // One request: each document with only its newest analysis embedded.
      const { data, error } = await supabase
        .from("documents")
        .select(`${FULL_COLUMNS}, analyses(${ANALYSIS_COLUMNS})`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("created_at", { referencedTable: "analyses", ascending: false })
        .limit(1, { referencedTable: "analyses" });
      if (error || !data) return null;
      return (data as (FullDocumentRow & { analyses: AnalysisRow[] | null })[]).map((row) => ({
        document: toStoredDocument(row),
        latestAnalysis: row.analyses && row.analyses.length > 0 ? toAnalysisRow(row.analyses[0]) : null,
      }));
    },

    async findWithLatestAnalysis(documentId: string) {
      const document = await supabase
        .from("documents")
        .select(FULL_COLUMNS)
        .eq("id", documentId)
        .maybeSingle<FullDocumentRow>();
      if (document.error) return { status: "failed" };
      if (!document.data) return { status: "missing" };

      const analysis = await supabase
        .from("analyses")
        .select(ANALYSIS_COLUMNS)
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<AnalysisRow>();
      if (analysis.error) return { status: "failed" };

      return {
        status: "found",
        document: toStoredDocument(document.data),
        latestAnalysis: analysis.data ? toAnalysisRow(analysis.data) : null,
      };
    },

    async insertAnalysis(documentId: string, record: AnalysisRecord) {
      // No user_id: the database fills it from the session, and the insert
      // policy refuses a document that isn't the caller's.
      const payload = { document_id: documentId, result: record.result, red_lines_used: record.redLinesUsed };
      const { data, error } = await supabase
        .from("analyses")
        .insert(payload)
        .select("id, created_at")
        .single<{ id: string; created_at: string }>();
      if (error || !data) return null;
      return { id: data.id, createdAt: data.created_at };
    },
  };
}
