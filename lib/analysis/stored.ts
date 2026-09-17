import { locateCitation, type Citation } from "@/lib/citations/citation";
import { RED_LINES_MAX_COUNT, RED_LINE_MAX_LENGTH } from "@/lib/red-lines/red-lines";
import {
  SEVERITY_AXES,
  SEVERITY_TIERS,
  type Analysis,
  type CounterOffer,
  type FlagWithCounterOffer,
  type RedLineMatch,
  type RedLineRef,
  type Verification,
} from "./types";

/**
 * The one trust boundary for analyses at rest.
 *
 * A stored analysis is JSON from the database, so it is as untrusted as model
 * output: a row could have been written by an older build, edited by hand, or
 * sent by a client that made it up. Nothing read from storage is shown until
 * `hydrateAnalysis` has rebuilt it against the document's own text, and
 * nothing is written until the same check has passed (`prepareAnalysisRecord`).
 *
 * Hydration rebuilds every `Citation` through `locateCitation` and requires
 * the stored span to be exactly `documentText.slice(start, end)`, so a flag or
 * red-line match whose sentence isn't where it says in *this* document can't
 * come back (ADR 0001). Shapes are strict: unknown fields, unknown tiers or
 * axes, a counter-offer anywhere but on a cited flag, and any score are
 * rejected, never repaired (ADR 0003).
 */

export const STORED_ANALYSIS_VERSION = 1;

export interface StoredCitation {
  text: string;
  start: number;
  end: number;
}

export interface StoredFlag {
  citation: StoredCitation;
  clauseType: string;
  severity: string;
  axis: string;
  rationale: string;
  counterOffer: CounterOffer;
}

export interface StoredRedLineMatch {
  redLine: { id: string; text: string };
  citation: StoredCitation;
  explanation: string;
}

/** The JSON written to `analyses.result`. */
export interface StoredAnalysis {
  version: typeof STORED_ANALYSIS_VERSION;
  summary: string;
  flags: StoredFlag[];
  redLineMatches: StoredRedLineMatch[];
  verification: Verification;
}

/** The JSON written to `analyses.red_lines_used`. */
export type StoredRedLinesUsed = { id: string; text: string }[];

export type HydrationProblem =
  /** Not an object, wrong version, or a required field missing or of the wrong type. */
  | "invalid-shape"
  /** A field this version doesn't have. */
  | "unknown-field"
  /** A score, rank or other number standing in for a judgment. There is no numeric severity. */
  | "numeric-score"
  /** A severity or axis that isn't one of the named values. */
  | "invalid-tier"
  /** A citation that isn't exactly the span of the document it claims. */
  | "citation-mismatch"
  /** A counter-offer that isn't drafted or unavailable, or sits somewhere other than a cited flag. */
  | "invalid-counter-offer"
  /** A red-line match naming a red line the analysis didn't run with. */
  | "unknown-red-line"
  /** Verification counts that don't describe these flags and matches. */
  | "inconsistent-counts";

export type HydrationFailure = { ok: false; problem: HydrationProblem; path: string };
export type Hydration = { ok: true; analysis: Analysis } | HydrationFailure;
export type RedLinesUsedHydration = { ok: true; redLines: RedLineRef[] } | HydrationFailure;

/** Turn an analysis into the JSON stored for it. Plain data only; no brands, no class instances. */
export function serializeAnalysis(analysis: Analysis): StoredAnalysis {
  return {
    version: STORED_ANALYSIS_VERSION,
    summary: analysis.summary,
    flags: analysis.flags.map((flag) => ({
      citation: serializeCitation(flag.citation),
      clauseType: flag.clauseType,
      severity: flag.severity,
      axis: flag.axis,
      rationale: flag.rationale,
      counterOffer:
        flag.counterOffer.status === "drafted"
          ? flag.counterOffer.note === undefined
            ? { status: "drafted", proposedLanguage: flag.counterOffer.proposedLanguage }
            : { status: "drafted", proposedLanguage: flag.counterOffer.proposedLanguage, note: flag.counterOffer.note }
          : { status: "unavailable" },
    })),
    redLineMatches: analysis.redLineMatches.map((match) => ({
      redLine: { id: match.redLine.id, text: match.redLine.text },
      citation: serializeCitation(match.citation),
      explanation: match.explanation,
    })),
    verification: { ...analysis.verification },
  };
}

export function serializeRedLinesUsed(redLines: readonly RedLineRef[]): StoredRedLinesUsed {
  return redLines.map((redLine) => ({ id: redLine.id, text: redLine.text }));
}

function serializeCitation(citation: Citation): StoredCitation {
  return { text: citation.text, start: citation.start, end: citation.end };
}

class Reject extends Error {
  constructor(
    readonly problem: HydrationProblem,
    readonly path: string,
  ) {
    super(`${problem} at ${path}`);
  }
}

/**
 * Rebuild an analysis read from storage, against the text of the document it
 * belongs to. Returns a typed failure instead of anything partial: one bad
 * citation fails the whole analysis, because showing the rest would present
 * an analysis that no longer matches its document as if it did.
 */
export function hydrateAnalysis(documentText: string, json: unknown): Hydration {
  try {
    return { ok: true, analysis: readAnalysis(documentText, json) };
  } catch (error) {
    if (error instanceof Reject) return { ok: false, problem: error.problem, path: error.path };
    throw error;
  }
}

/** Read the red lines an analysis ran with. */
export function hydrateRedLinesUsed(json: unknown): RedLinesUsedHydration {
  try {
    return { ok: true, redLines: readRedLinesUsed(json) };
  } catch (error) {
    if (error instanceof Reject) return { ok: false, problem: error.problem, path: error.path };
    throw error;
  }
}

export type StoredAnalysisHydration =
  | { ok: true; analysis: Analysis; redLinesUsed: RedLineRef[] }
  | HydrationFailure;

/**
 * An analysis row's two JSON columns, checked together: the analysis against
 * the document text, and every red-line match against the red lines it ran with.
 */
export function hydrateStoredAnalysis(
  documentText: string,
  row: { result: unknown; redLinesUsed: unknown },
): StoredAnalysisHydration {
  const redLines = hydrateRedLinesUsed(row.redLinesUsed);
  if (!redLines.ok) return { ...redLines, path: `redLinesUsed${redLines.path}` };
  const hydrated = hydrateAnalysis(documentText, row.result);
  if (!hydrated.ok) return hydrated;

  const index = hydrated.analysis.redLineMatches.findIndex(
    (match) => !redLines.redLines.some((r) => r.id === match.redLine.id && r.text === match.redLine.text),
  );
  if (index !== -1) return { ok: false, problem: "unknown-red-line", path: `.redLineMatches[${index}].redLine` };
  return { ok: true, analysis: hydrated.analysis, redLinesUsed: redLines.redLines };
}

declare const recordBrand: unique symbol;

/**
 * What the store is allowed to write. Only `prepareAnalysisRecord` makes one,
 * after the analysis has passed the same check a read does.
 */
export type AnalysisRecord = {
  readonly result: StoredAnalysis;
  readonly redLinesUsed: StoredRedLinesUsed;
  readonly [recordBrand]: true;
};

/**
 * Serialise an analysis for storage and prove it reads back against the text
 * it will be stored with. An analysis that wouldn't hydrate is never written.
 */
export function prepareAnalysisRecord(
  documentText: string,
  analysis: Analysis,
  redLinesUsed: readonly RedLineRef[],
): { ok: true; record: AnalysisRecord } | HydrationFailure {
  const result = serializeAnalysis(analysis);
  const used = serializeRedLinesUsed(redLinesUsed);
  // Round-trip through JSON so what is checked is exactly what the database gets.
  const check = hydrateStoredAnalysis(documentText, JSON.parse(JSON.stringify({ result, redLinesUsed: used })));
  if (!check.ok) return check;
  return { ok: true, record: { result, redLinesUsed: used } as AnalysisRecord };
}

const ANALYSIS_KEYS = ["version", "summary", "flags", "redLineMatches", "verification"] as const;
const FLAG_KEYS = ["citation", "clauseType", "severity", "axis", "rationale", "counterOffer"] as const;
const MATCH_KEYS = ["redLine", "citation", "explanation"] as const;
const CITATION_KEYS = ["text", "start", "end"] as const;
const RED_LINE_KEYS = ["id", "text"] as const;
const VERIFICATION_KEYS = [
  "proposed",
  "kept",
  "droppedNoSource",
  "droppedInvalid",
  "droppedDuplicate",
  "rationalesReplaced",
  "counterOffersDrafted",
  "counterOffersUnavailable",
  "redLineMatchesProposed",
  "redLineMatchesKept",
  "redLineMatchesDroppedNoSource",
  "redLineMatchesDroppedInvalid",
  "redLineMatchesDroppedDuplicate",
  "redLineExplanationsReplaced",
] as const satisfies readonly (keyof Verification)[];

const SCORE_LIKE = /score|rank|rating|points|weight/i;

function readAnalysis(documentText: string, json: unknown): Analysis {
  const record = object(json, "");
  exactKeys(record, ANALYSIS_KEYS, [], "");
  if (record.version !== STORED_ANALYSIS_VERSION) throw new Reject("invalid-shape", ".version");

  const summary = text(record.summary, ".summary");
  const flags = array(record.flags, ".flags").map((flag, i) => readFlag(documentText, flag, `.flags[${i}]`));
  const redLineMatches = array(record.redLineMatches, ".redLineMatches").map((match, i) =>
    readMatch(documentText, match, `.redLineMatches[${i}]`),
  );
  const verification = readVerification(record.verification, ".verification");

  const drafted = flags.filter((flag) => flag.counterOffer.status === "drafted").length;
  if (
    verification.kept !== flags.length ||
    verification.counterOffersDrafted !== drafted ||
    verification.counterOffersUnavailable !== flags.length - drafted ||
    verification.redLineMatchesKept !== redLineMatches.length
  ) {
    throw new Reject("inconsistent-counts", ".verification");
  }

  return { summary, flags, redLineMatches, verification };
}

function readFlag(documentText: string, json: unknown, path: string): FlagWithCounterOffer {
  const record = object(json, path);
  // Checked before anything else, so a counter-offer on a flag with no citation fails as exactly that.
  if (!("citation" in record) && "counterOffer" in record) throw new Reject("invalid-counter-offer", `${path}.counterOffer`);
  exactKeys(record, FLAG_KEYS, [], path);

  const citation = readCitation(documentText, record.citation, `${path}.citation`);
  const severity = SEVERITY_TIERS.find((tier) => tier === record.severity);
  if (!severity) throw new Reject(typeof record.severity === "number" ? "numeric-score" : "invalid-tier", `${path}.severity`);
  const axis = SEVERITY_AXES.find((a) => a === record.axis);
  if (!axis) throw new Reject("invalid-tier", `${path}.axis`);

  return {
    citation,
    clauseType: text(record.clauseType, `${path}.clauseType`),
    severity,
    axis,
    rationale: text(record.rationale, `${path}.rationale`),
    counterOffer: readCounterOffer(record.counterOffer, `${path}.counterOffer`),
  };
}

function readCounterOffer(json: unknown, path: string): CounterOffer {
  if (!isRecord(json)) throw new Reject("invalid-counter-offer", path);
  if (json.status === "unavailable") {
    exactKeys(json, ["status"], [], path);
    return { status: "unavailable" };
  }
  if (json.status === "drafted") {
    exactKeys(json, ["status", "proposedLanguage"], ["note"], path);
    const proposedLanguage = text(json.proposedLanguage, `${path}.proposedLanguage`);
    if (json.note === undefined) return { status: "drafted", proposedLanguage };
    return { status: "drafted", proposedLanguage, note: text(json.note, `${path}.note`) };
  }
  throw new Reject("invalid-counter-offer", `${path}.status`);
}

function readMatch(documentText: string, json: unknown, path: string): RedLineMatch {
  const record = object(json, path);
  if ("counterOffer" in record) throw new Reject("invalid-counter-offer", `${path}.counterOffer`);
  exactKeys(record, MATCH_KEYS, [], path);
  return {
    redLine: readRedLine(record.redLine, `${path}.redLine`),
    citation: readCitation(documentText, record.citation, `${path}.citation`),
    explanation: text(record.explanation, `${path}.explanation`),
  };
}

function readRedLine(json: unknown, path: string): RedLineRef {
  const record = object(json, path);
  exactKeys(record, RED_LINE_KEYS, [], path);
  const redLineText = text(record.text, `${path}.text`);
  if (redLineText.length > RED_LINE_MAX_LENGTH) throw new Reject("invalid-shape", `${path}.text`);
  return { id: text(record.id, `${path}.id`), text: redLineText };
}

/**
 * The only way a stored citation becomes a `Citation`: `locateCitation` finds
 * the quote in this document, and it must land on exactly the stored span.
 */
function readCitation(documentText: string, json: unknown, path: string): Citation {
  const record = object(json, path);
  exactKeys(record, CITATION_KEYS, [], path);
  const quote = record.text;
  const { start, end } = record;
  if (typeof quote !== "string" || quote.length === 0) throw new Reject("invalid-shape", `${path}.text`);
  if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Reject("invalid-shape", path);

  if (documentText.slice(start as number, end as number) !== quote) throw new Reject("citation-mismatch", path);
  const citation = locateCitation(documentText, quote);
  if (!citation || citation.start !== start || citation.end !== end || citation.text !== quote) {
    throw new Reject("citation-mismatch", path);
  }
  return citation;
}

function readVerification(json: unknown, path: string): Verification {
  const record = object(json, path);
  exactKeys(record, VERIFICATION_KEYS, [], path);
  const verification = {} as Verification;
  for (const key of VERIFICATION_KEYS) {
    const value = record[key];
    if (!Number.isInteger(value) || (value as number) < 0) throw new Reject("invalid-shape", `${path}.${key}`);
    verification[key] = value as number;
  }
  return verification;
}

function readRedLinesUsed(json: unknown): RedLineRef[] {
  const list = array(json, "");
  if (list.length > RED_LINES_MAX_COUNT) throw new Reject("invalid-shape", "");
  const redLines = list.map((entry, i) => readRedLine(entry, `[${i}]`));
  const ids = new Set(redLines.map((r) => r.id));
  if (ids.size !== redLines.length) throw new Reject("invalid-shape", "");
  return redLines;
}

function exactKeys(
  record: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): void {
  for (const key of Object.keys(record)) {
    if (required.includes(key) || optional.includes(key)) continue;
    throw new Reject(SCORE_LIKE.test(key) ? "numeric-score" : "unknown-field", `${path}.${key}`);
  }
  for (const key of required) {
    if (!(key in record)) throw new Reject("invalid-shape", `${path}.${key}`);
  }
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Reject("invalid-shape", path);
  return value;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Reject("invalid-shape", path);
  return value;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Reject("invalid-shape", path);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
