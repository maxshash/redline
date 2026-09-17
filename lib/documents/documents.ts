/**
 * Keeping a document: validation and the save flow, independent of Supabase.
 *
 * Only a title and the extracted text are ever stored, plus, when the document
 * was already checked, that analysis. The owner is not part of the payload:
 * the database fills `user_id` from the signed-in session and row-level
 * security refuses any other value.
 */

import { hydrateStoredAnalysis, prepareAnalysisRecord, type AnalysisRecord } from "@/lib/analysis/stored";

export const TITLE_MAX_LENGTH = 200;
/**
 * About 60 dense pages. Kept well under the 1 MB server action body limit even
 * for text that is mostly multi-byte characters. Mirrored by a check
 * constraint in the documents migration.
 */
export const TEXT_MAX_LENGTH = 200_000;

export interface NewDocument {
  title: string;
  text: string;
}

export interface SavedDocument {
  id: string;
  title: string;
  createdAt: string;
}

/** A kept document with its text, as read back from storage. */
export interface StoredDocument {
  id: string;
  title: string;
  text: string;
  createdAt: string;
}

/**
 * An analyses row as read from storage. Its JSON is untrusted until
 * `hydrateStoredAnalysis` has checked it against the document's text.
 */
export interface StoredAnalysisRow {
  id: string;
  result: unknown;
  redLinesUsed: unknown;
  createdAt: string;
}

export interface SavedAnalysisMeta {
  id: string;
  createdAt: string;
}

/** A document and the latest of its analyses, if it has any. */
export interface DocumentWithLatestAnalysis {
  document: StoredDocument;
  latestAnalysis: StoredAnalysisRow | null;
}

export type DocumentLookup =
  | ({ status: "found" } & DocumentWithLatestAnalysis)
  /** No such row, or not the caller's: row-level security makes the two look the same. */
  | { status: "missing" }
  | { status: "failed" };

/**
 * The storage boundary. The Supabase implementation lives in ./supabase;
 * tests pass a fake so the flows' own rules are what gets exercised.
 */
export interface DocumentStore {
  /** The signed-in user's id from verified session claims, or null. */
  currentUserId(): Promise<string | null>;
  /** Insert exactly `document`; null if the insert failed. */
  insert(document: NewDocument): Promise<SavedDocument | null>;
  /** The user's documents, newest first; null if the read failed. */
  listForUser(userId: string): Promise<SavedDocument[] | null>;
  /** The user's documents with text and latest analysis, newest first; null if the read failed. */
  listWithLatestAnalysis(userId: string): Promise<DocumentWithLatestAnalysis[] | null>;
  /** One document by id, with its latest analysis. */
  findWithLatestAnalysis(documentId: string): Promise<DocumentLookup>;
  /**
   * Store an analysis of a document. Takes only an `AnalysisRecord`, which
   * exists only once the analysis has been checked against the text it is
   * stored with. Null if the insert failed.
   */
  insertAnalysis(documentId: string, record: AnalysisRecord): Promise<SavedAnalysisMeta | null>;
}

export const DOCUMENT_COPY = {
  missingTitle: "Give the document a title.",
  longTitle: `Shorten the title to ${TITLE_MAX_LENGTH} characters or fewer.`,
  missingText: "There's no text to save.",
  longText: `This document is too long to keep. The limit is ${TEXT_MAX_LENGTH.toLocaleString("en-US")} characters.`,
  saveFailed: "Couldn't save the document. Try again.",
  analysisMismatch:
    "The check on screen doesn't match this text, so nothing was saved. Check the document again, then save it.",
} as const;

export type SaveDocumentState =
  | { status: "idle" }
  /**
   * `analysis` is there only when one was sent: "saved" when it was stored
   * alongside the document, "failed" when the document was kept without it.
   */
  | { status: "saved"; document: SavedDocument; analysis?: "saved" | "failed" }
  | { status: "invalid"; message: string }
  | { status: "signed-out" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

export type Validation = { ok: true; document: NewDocument } | { ok: false; message: string };

/**
 * Check an untrusted payload. A server action can be called directly, so
 * nothing about the shape of `input` is assumed. The title is trimmed; the
 * text is kept exactly as extracted, because citations point into it.
 */
export function validateNewDocument(input: unknown): Validation {
  const record = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const text = typeof record.text === "string" ? record.text : "";

  if (title.length === 0) return { ok: false, message: DOCUMENT_COPY.missingTitle };
  if (title.length > TITLE_MAX_LENGTH) return { ok: false, message: DOCUMENT_COPY.longTitle };
  if (text.trim().length === 0) return { ok: false, message: DOCUMENT_COPY.missingText };
  if (text.length > TEXT_MAX_LENGTH) return { ok: false, message: DOCUMENT_COPY.longText };

  // Build a fresh object so nothing else in the payload can reach the insert.
  return { ok: true, document: { title, text } };
}

/**
 * Save a document for the signed-in user. `store` is null when Supabase isn't
 * configured, which is reported as unavailable rather than faked.
 *
 * If the payload carries `analysis` (`{ result, redLinesUsed }`, the check the
 * reader already ran on this text), it comes from the browser and is treated
 * as untrusted: it has to hydrate against the text being saved, citation by
 * citation, before anything is written. If it doesn't, nothing is stored, not
 * even the document, so the reader isn't left with a document whose check
 * silently went missing.
 */
export async function runSaveDocument(input: unknown, store: DocumentStore | null): Promise<SaveDocumentState> {
  if (!store) return { status: "unavailable" };
  const userId = await store.currentUserId();
  if (!userId) return { status: "signed-out" };

  const validation = validateNewDocument(input);
  if (!validation.ok) return { status: "invalid", message: validation.message };

  const sent = typeof input === "object" && input !== null ? (input as Record<string, unknown>).analysis : undefined;
  let record: AnalysisRecord | null = null;
  if (sent !== undefined && sent !== null) {
    const payload = typeof sent === "object" ? (sent as Record<string, unknown>) : {};
    const checked = hydrateStoredAnalysis(validation.document.text, {
      result: payload.result,
      redLinesUsed: payload.redLinesUsed,
    });
    if (!checked.ok) return { status: "invalid", message: DOCUMENT_COPY.analysisMismatch };
    const prepared = prepareAnalysisRecord(validation.document.text, checked.analysis, checked.redLinesUsed);
    if (!prepared.ok) return { status: "invalid", message: DOCUMENT_COPY.analysisMismatch };
    record = prepared.record;
  }

  const saved = await store.insert(validation.document);
  if (!saved) return { status: "error", message: DOCUMENT_COPY.saveFailed };
  if (!record) return { status: "saved", document: saved };

  const analysis = await store.insertAnalysis(saved.id, record);
  return { status: "saved", document: saved, analysis: analysis ? "saved" : "failed" };
}

/** A document title from a file name: the name without its extension. */
export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "").trim();
  return (base || name).slice(0, TITLE_MAX_LENGTH);
}

/** A title for pasted text: its first line, cut at a word boundary if it runs long. */
export function titleFromText(text: string, fallback = "Pasted document"): string {
  const firstLine = text.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";
  if (firstLine.length === 0) return fallback;
  if (firstLine.length <= 80) return firstLine;
  const cut = firstLine.slice(0, 80);
  const space = cut.lastIndexOf(" ");
  return `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`;
}
