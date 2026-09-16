import type { DocumentStore, NewDocument, SavedDocument } from "@/lib/documents/documents";

export interface FakeDocumentStoreOptions {
  userId?: string | null;
  insertFails?: boolean;
}

/**
 * A stand-in for the documents table at the DocumentStore boundary. It
 * records every insert payload exactly as received and holds no rules of its own.
 */
export function fakeDocumentStore(options: FakeDocumentStoreOptions = {}): DocumentStore & { inserts: unknown[] } {
  const inserts: unknown[] = [];
  const rows: SavedDocument[] = [];
  return {
    inserts,
    async currentUserId() {
      return options.userId === undefined ? "user-a" : options.userId;
    },
    async insert(document: NewDocument) {
      inserts.push(document);
      if (options.insertFails) return null;
      const saved = { id: `doc-${rows.length + 1}`, title: document.title, createdAt: "2026-09-16T12:00:00Z" };
      rows.unshift(saved);
      return saved;
    },
    async listForUser() {
      return [...rows];
    },
  };
}
