import { runAnalyzeDocument, type AnalyzeFailure, type RedLinesUsed } from "@/lib/analysis/run";
import { hydrateStoredAnalysis, prepareAnalysisRecord } from "@/lib/analysis/stored";
import { SEVERITY_TIERS, type Analysis, type Flag, type RedLineRef, type SeverityTier } from "@/lib/analysis/types";
import { ANALYSIS_COPY } from "@/lib/analysis/copy";
import type {
  DocumentStore,
  SavedAnalysisMeta,
  StoredAnalysisRow,
  StoredDocument,
} from "@/lib/documents/documents";
import type { ModelClient } from "@/lib/model/client";
import type { RedLineStore } from "@/lib/red-lines/red-lines";
import { LIBRARY_COPY } from "./copy";

export { LIBRARY_COPY } from "./copy";

/**
 * The library's own logic, with storage and the model injected: listing a
 * user's documents, reopening one with its saved analysis, and checking a
 * saved document and keeping that check.
 *
 * Reopening never calls the model. A saved analysis is read, hydrated against
 * the document's stored text (lib/analysis/stored.ts), and shown only if every
 * citation still lands on its sentence. One that doesn't is reported as
 * needing a rerun, never shown.
 */

export interface LibraryDeps {
  /** Null when Supabase isn't configured. */
  store: DocumentStore | null;
  /** Build the model client. Only checking a document uses it. */
  model: () => ModelClient;
  /** The signed-in user's red lines, read on the server. Null when Supabase isn't configured. */
  redLineStore: RedLineStore | null;
  /** Where failures are reported for whoever runs the server. Defaults to console.error. */
  log?: (message: string) => void;
}

/** What is known about a document's latest saved analysis. */
export type SavedCheck =
  | { status: "none" }
  | { status: "saved"; analysis: Analysis; redLinesUsed: RedLineRef[]; checkedAt: string }
  /** There is a saved analysis, but it didn't hydrate against the document's text. */
  | { status: "needs-rerun"; checkedAt: string };

export type OpenDocumentState =
  | { status: "found"; document: StoredDocument; check: SavedCheck }
  | { status: "not-found" }
  | { status: "failed"; message: string }
  | { status: "signed-out"; message: string }
  | { status: "unavailable"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A document id from a URL or a payload, or null if it can't be one. */
export function readDocumentId(input: unknown): string | null {
  const raw =
    typeof input === "string"
      ? input
      : typeof input === "object" && input !== null
        ? (input as Record<string, unknown>).documentId
        : undefined;
  const id = typeof raw === "string" ? raw.trim() : "";
  return UUID.test(id) ? id.toLowerCase() : null;
}

type Session = { ok: true; store: DocumentStore } | { ok: false; state: { status: "signed-out" | "unavailable"; message: string } };

async function session(store: DocumentStore | null): Promise<Session> {
  if (!store) return { ok: false, state: { status: "unavailable", message: LIBRARY_COPY.unavailable } };
  if (!(await store.currentUserId())) return { ok: false, state: { status: "signed-out", message: LIBRARY_COPY.signedOut } };
  return { ok: true, store };
}

/**
 * Reopen a saved document with its latest analysis, exactly as stored. An id
 * that isn't a document id, doesn't exist, or belongs to someone else is
 * "not-found" all the same.
 */
export async function openSavedDocument(documentId: unknown, deps: LibraryDeps): Promise<OpenDocumentState> {
  const log = deps.log ?? ((message: string) => console.error(message));
  const s = await session(deps.store);
  if (!s.ok) return s.state;

  const id = readDocumentId(documentId);
  if (!id) return { status: "not-found" };

  const found = await s.store.findWithLatestAnalysis(id);
  if (found.status === "missing") return { status: "not-found" };
  if (found.status === "failed") return { status: "failed", message: LIBRARY_COPY.loadFailed };

  return { status: "found", document: found.document, check: readCheck(found.document, found.latestAnalysis, log) };
}

function readCheck(document: StoredDocument, row: StoredAnalysisRow | null, log: (message: string) => void): SavedCheck {
  if (!row) return { status: "none" };
  const hydrated = hydrateStoredAnalysis(document.text, row);
  if (!hydrated.ok) {
    log(`[library] analysis ${row.id} of document ${document.id} failed hydration: ${hydrated.problem} at ${hydrated.path}`);
    return { status: "needs-rerun", checkedAt: row.createdAt };
  }
  return { status: "saved", analysis: hydrated.analysis, redLinesUsed: hydrated.redLinesUsed, checkedAt: row.createdAt };
}

/** How many flags sit in each tier. Counts only; there is no score (ADR 0003). */
export type TierTally = Record<SeverityTier, number>;

export function tallyFlags(flags: readonly Pick<Flag, "severity">[]): TierTally {
  const tally: TierTally = { critical: 0, serious: 0, "worth-noting": 0 };
  for (const flag of flags) tally[flag.severity]++;
  return tally;
}

const TALLY_WORDS: Record<SeverityTier, string> = {
  critical: "critical",
  serious: "serious",
  "worth-noting": "worth noting",
};

/** "2 critical · 1 serious", heaviest first, leaving out empty tiers. */
export function tallyLabel(tally: TierTally): string {
  const parts = SEVERITY_TIERS.filter((tier) => tally[tier] > 0).map((tier) => `${tally[tier]} ${TALLY_WORDS[tier]}`);
  return parts.length > 0 ? parts.join(" · ") : LIBRARY_COPY.noWarnings;
}

export type LibraryCheck =
  | { status: "none" }
  | { status: "saved"; tally: TierTally; checkedAt: string }
  | { status: "needs-rerun"; checkedAt: string };

export interface LibraryEntry {
  id: string;
  title: string;
  createdAt: string;
  check: LibraryCheck;
}

export type LibraryState =
  | { status: "listed"; documents: LibraryEntry[] }
  | { status: "failed"; message: string }
  | { status: "signed-out"; message: string }
  | { status: "unavailable"; message: string };

/**
 * Every document the user keeps, newest first, each with a tally of its
 * latest saved analysis. The tally is counted from the hydrated flags, so an
 * analysis that no longer matches its document is never summarised as if valid.
 */
export async function listLibrary(deps: Pick<LibraryDeps, "store" | "log">): Promise<LibraryState> {
  const log = deps.log ?? ((message: string) => console.error(message));
  if (!deps.store) return { status: "unavailable", message: LIBRARY_COPY.unavailable };
  const userId = await deps.store.currentUserId();
  if (!userId) return { status: "signed-out", message: LIBRARY_COPY.signedOut };

  const rows = await deps.store.listWithLatestAnalysis(userId);
  if (!rows) return { status: "failed", message: LIBRARY_COPY.listFailed };

  const documents = rows
    .map(({ document, latestAnalysis }): LibraryEntry => {
      const check = readCheck(document, latestAnalysis, log);
      return {
        id: document.id,
        title: document.title,
        createdAt: document.createdAt,
        check:
          check.status === "saved"
            ? { status: "saved", tally: tallyFlags(check.analysis.flags), checkedAt: check.checkedAt }
            : check,
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return { status: "listed", documents };
}

export type AnalyzeSavedState =
  | {
      status: "analyzed";
      analysis: Analysis;
      redLines: RedLinesUsed;
      /** Where the check was stored, or null if storing it failed. */
      saved: SavedAnalysisMeta | null;
    }
  | { status: "not-found"; message: string }
  | { status: "signed-out"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; reason: AnalyzeFailure | "load-failed"; message: string };

/**
 * Check a saved document and keep the result with it. The text is the one
 * stored for the document, read on the server; nothing in the payload but the
 * document id is used. Red lines are the user's own, read on the server.
 *
 * The analysis goes through `prepareAnalysisRecord` before it is written, so
 * a check whose citations don't land in this document's stored text is never
 * stored. If storing fails, the check is still returned with `saved: null`.
 */
export async function analyzeSavedDocument(input: unknown, deps: LibraryDeps): Promise<AnalyzeSavedState> {
  const log = deps.log ?? ((message: string) => console.error(message));
  const s = await session(deps.store);
  if (!s.ok) return s.state;

  const id = readDocumentId(input);
  if (!id) return { status: "not-found", message: LIBRARY_COPY.notFound };
  const found = await s.store.findWithLatestAnalysis(id);
  if (found.status === "missing") return { status: "not-found", message: LIBRARY_COPY.notFound };
  if (found.status === "failed") return { status: "error", reason: "load-failed", message: LIBRARY_COPY.loadFailed };

  const text = found.document.text;
  const state = await runAnalyzeDocument({ text }, { model: deps.model, redLineStore: deps.redLineStore, log });
  if (state.status !== "analyzed") return state;

  const redLinesUsed = state.redLines.status === "loaded" ? state.redLines.redLines : [];
  const prepared = prepareAnalysisRecord(text, state.analysis, redLinesUsed);
  if (!prepared.ok) {
    log(`[library] refused to store an analysis of ${id}: ${prepared.problem} at ${prepared.path}`);
    return { status: "error", reason: "invalid-output", message: ANALYSIS_COPY.invalidOutput };
  }

  const saved = await s.store.insertAnalysis(id, prepared.record);
  if (!saved) log(`[library] could not store the analysis of ${id}`);
  return { status: "analyzed", analysis: state.analysis, redLines: state.redLines, saved };
}
