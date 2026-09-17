import { randomUUID } from "node:crypto";
import type {
  DocumentStore,
  NewDocument,
  SavedDocument,
  StoredAnalysisRow,
  StoredDocument,
} from "@/lib/documents/documents";

export interface FakeAnalysisRow extends StoredAnalysisRow {
  documentId: string;
}

export interface FakeDocumentStoreOptions {
  userId?: string | null;
  insertFails?: boolean;
  analysisInsertFails?: boolean;
  /** Every read fails, the way a dropped connection would. */
  readFails?: boolean;
  /** Documents already kept, as the owner would see them. */
  documents?: StoredDocument[];
  /** Analyses already stored, in insertion order. */
  analyses?: FakeAnalysisRow[];
}

/**
 * A stand-in for the documents and analyses tables at the DocumentStore
 * boundary. It records every write exactly as received, returns stored JSON
 * untouched, and holds no rules of its own: nothing here checks an analysis.
 */
export function fakeDocumentStore(options: FakeDocumentStoreOptions = {}) {
  const inserts: unknown[] = [];
  const analysisInserts: { documentId: string; record: unknown }[] = [];
  const rows: SavedDocument[] = [];
  const documents: StoredDocument[] = [...(options.documents ?? [])];
  const analyses: FakeAnalysisRow[] = [...(options.analyses ?? [])];
  let clock = 0;

  const latestFor = (documentId: string) =>
    analyses
      .filter((row) => row.documentId === documentId)
      .reduce<FakeAnalysisRow | null>((latest, row) => (!latest || row.createdAt >= latest.createdAt ? row : latest), null);
  const asRow = (row: FakeAnalysisRow | null): StoredAnalysisRow | null =>
    row ? { id: row.id, result: row.result, redLinesUsed: row.redLinesUsed, createdAt: row.createdAt } : null;

  const store: DocumentStore & {
    inserts: unknown[];
    analysisInserts: typeof analysisInserts;
    documents: StoredDocument[];
    analyses: FakeAnalysisRow[];
  } = {
    inserts,
    analysisInserts,
    documents,
    analyses,
    async currentUserId() {
      return options.userId === undefined ? "user-a" : options.userId;
    },
    async insert(document: NewDocument) {
      inserts.push(document);
      if (options.insertFails) return null;
      const saved = { id: `doc-${rows.length + 1}`, title: document.title, createdAt: "2026-09-16T12:00:00Z" };
      rows.unshift(saved);
      documents.unshift({ ...saved, text: document.text });
      return saved;
    },
    async listForUser() {
      return [...rows];
    },
    async listWithLatestAnalysis() {
      if (options.readFails) return null;
      return documents.map((document) => ({ document: { ...document }, latestAnalysis: asRow(latestFor(document.id)) }));
    },
    async findWithLatestAnalysis(documentId) {
      if (options.readFails) return { status: "failed" };
      const document = documents.find((d) => d.id === documentId);
      if (!document) return { status: "missing" };
      return { status: "found", document: { ...document }, latestAnalysis: asRow(latestFor(documentId)) };
    },
    async insertAnalysis(documentId, record) {
      analysisInserts.push({ documentId, record });
      if (options.analysisInsertFails) return null;
      const row: FakeAnalysisRow = {
        id: randomUUID(),
        documentId,
        // Stored the way jsonb would: a copy of the JSON, nothing more.
        result: JSON.parse(JSON.stringify(record.result)),
        redLinesUsed: JSON.parse(JSON.stringify(record.redLinesUsed)),
        createdAt: `2026-09-17T12:00:${String(clock++).padStart(2, "0")}Z`,
      };
      analyses.push(row);
      return { id: row.id, createdAt: row.createdAt };
    },
  };
  return store;
}
