import type { ModelClient } from "@/lib/model/client";
import { locateCitation } from "./citation";
import { draftCounterOffers } from "./counter-offer";
import {
  ANALYSIS_SCHEMA,
  ANALYSIS_SCHEMA_NAME,
  ANALYSIS_SYSTEM_PROMPT,
  analysisUserMessage,
  type RedLineRequestEntry,
} from "./prompt";
import {
  SEVERITY_AXES,
  SEVERITY_TIERS,
  type Analysis,
  type Flag,
  type RedLineMatch,
  type RedLineRef,
  type SeverityAxis,
  type SeverityTier,
  type Verification,
} from "./types";
import { FALLBACK_RED_LINE_EXPLANATION, checkRationale, checkRedLineExplanation, fallbackRationale } from "./voice";

export type AnalysisErrorKind =
  /** There was no document text to send. */
  | "no-text"
  /** The model call itself failed: network, OpenRouter error, non-JSON content, or a throw. */
  | "model-failed"
  /** The model answered, but not with a summary, a flags list and a red-line matches list. */
  | "invalid-output";

export class AnalysisError extends Error {
  readonly kind: AnalysisErrorKind;

  constructor(kind: AnalysisErrorKind, message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "AnalysisError";
    this.kind = kind;
  }
}

export interface AnalyzeDeps {
  model: ModelClient;
  /** Where a failure that doesn't stop the analysis is reported. Defaults to console.error. */
  log?: (message: string) => void;
}

/**
 * Read a document: a plain-English summary and flags against the default
 * clause library, each tied to the exact span of `text` it quotes.
 *
 * The model's output is untrusted. Every proposed flag has to survive, in
 * order: field validation, citation lookup against `text` (ADR 0001), and
 * de-duplication by span. Its rationale is then checked against its own
 * quote; if it asserts something the quote doesn't contain, the flag is kept
 * (ADR 0004) and the rationale is replaced with one that asserts nothing
 * beyond the tier and axis (ADR 0005). Zero flags is a valid result (ADR 0006).
 *
 * The same call reports red-line matches: clauses about one of `redLines`,
 * whether or not they are dangerous (ADR 0007). Each proposed match has to
 * name a red line that was sent and survive the same citation lookup; matches
 * for the same red line and span are merged, and an explanation that asserts
 * something neither the quote nor the red line contains is replaced. Matches
 * are a separate list in document order. They never add, remove or re-tier a
 * flag, and they never get a counter-offer.
 *
 * Only then, and only if at least one flag survived, a second call drafts a
 * counter-offer per flag (`draftCounterOffers`). It only ever sees verified
 * flags. If that call fails, the flags still come back, each with an
 * "unavailable" counter-offer.
 *
 * `text` is passed to the model unchanged, and citations index into it.
 */
export async function analyzeDocument(
  text: string,
  redLines: readonly RedLineRef[],
  deps: AnalyzeDeps,
): Promise<Analysis> {
  if (text.trim().length === 0) {
    throw new AnalysisError("no-text", "There is no document text to analyse.");
  }

  // The model gets short ids it can copy back reliably; they map to the real ones here.
  const sent = new Map<string, RedLineRef>();
  const seenIds = new Set<string>();
  for (const redLine of redLines) {
    const redLineText = redLine.text.trim();
    if (redLineText.length === 0 || seenIds.has(redLine.id)) continue;
    seenIds.add(redLine.id);
    sent.set(`red-line-${sent.size + 1}`, { id: redLine.id, text: redLineText });
  }
  const requestRedLines: RedLineRequestEntry[] = [...sent].map(([redLineId, redLine]) => ({
    redLineId,
    text: redLine.text,
  }));

  let output: unknown;
  try {
    output = await deps.model.completeJson({
      name: ANALYSIS_SCHEMA_NAME,
      system: ANALYSIS_SYSTEM_PROMPT,
      user: analysisUserMessage(text, requestRedLines),
      schema: ANALYSIS_SCHEMA,
    });
  } catch (cause) {
    throw new AnalysisError("model-failed", "The model call failed.", { cause });
  }

  if (!isRecord(output)) {
    throw new AnalysisError("invalid-output", "The model's output was not a JSON object.");
  }
  const summary = typeof output.summary === "string" ? output.summary.trim() : "";
  if (summary.length === 0) {
    throw new AnalysisError("invalid-output", "The model's output had no summary.");
  }
  // A missing flags list is not the same as an empty one. Reading it as a
  // clean document would report "nothing found" for something never checked.
  if (!Array.isArray(output.flags)) {
    throw new AnalysisError("invalid-output", "The model's output had no flags list.");
  }
  // Likewise, a missing matches list isn't "none of your red lines came up".
  // With no red lines sent there is nothing it could have left out.
  const proposedMatches = Array.isArray(output.redLineMatches) ? output.redLineMatches : null;
  if (proposedMatches === null && sent.size > 0) {
    throw new AnalysisError("invalid-output", "The model's output had no red-line matches list.");
  }

  const verification: Verification = {
    proposed: output.flags.length,
    kept: 0,
    droppedNoSource: 0,
    droppedInvalid: 0,
    droppedDuplicate: 0,
    rationalesReplaced: 0,
    counterOffersDrafted: 0,
    counterOffersUnavailable: 0,
    redLineMatchesProposed: proposedMatches?.length ?? 0,
    redLineMatchesKept: 0,
    redLineMatchesDroppedNoSource: 0,
    redLineMatchesDroppedInvalid: 0,
    redLineMatchesDroppedDuplicate: 0,
    redLineExplanationsReplaced: 0,
  };

  const bySpan = new Map<string, Flag>();
  for (const candidate of output.flags) {
    const proposal = readProposal(candidate);
    if (!proposal) {
      verification.droppedInvalid++;
      continue;
    }
    const citation = locateCitation(text, proposal.quote);
    if (!citation) {
      verification.droppedNoSource++;
      continue;
    }

    const flag: Flag = {
      citation,
      clauseType: proposal.clauseType,
      severity: proposal.severity,
      axis: proposal.axis,
      rationale: proposal.rationale,
    };
    const key = `${citation.start}:${citation.end}`;
    const existing = bySpan.get(key);
    if (existing) {
      verification.droppedDuplicate++;
      // Two flags on one span: keep the heavier judgment.
      if (tierRank(flag.severity) < tierRank(existing.severity)) bySpan.set(key, flag);
      continue;
    }
    bySpan.set(key, flag);
  }

  const flags = [...bySpan.values()].map((flag) => {
    if (checkRationale(flag.rationale, flag.citation.text).supported) return flag;
    verification.rationalesReplaced++;
    return { ...flag, rationale: fallbackRationale(flag.severity, flag.axis) };
  });

  flags.sort(
    (a, b) => tierRank(a.severity) - tierRank(b.severity) || a.citation.start - b.citation.start || a.citation.end - b.citation.end,
  );
  verification.kept = flags.length;

  const redLineMatches = verifyRedLineMatches(text, proposedMatches ?? [], sent, verification);

  // Counter-offers are for flags only. Red-line matches are never sent.
  const withCounterOffers = flags.length > 0 ? await draftCounterOffers(text, flags, deps) : [];
  for (const flag of withCounterOffers) {
    if (flag.counterOffer.status === "drafted") verification.counterOffersDrafted++;
    else verification.counterOffersUnavailable++;
  }

  return { summary, flags: withCounterOffers, redLineMatches, verification };
}

/**
 * Turn the model's proposed red-line matches into verified ones. Nothing here
 * reads or changes flags.
 */
function verifyRedLineMatches(
  text: string,
  proposed: readonly unknown[],
  sent: ReadonlyMap<string, RedLineRef>,
  verification: Verification,
): RedLineMatch[] {
  const order = [...sent.keys()];
  const bySpan = new Map<string, RedLineMatch>();

  for (const candidate of proposed) {
    const proposal = readMatchProposal(candidate);
    const redLine = proposal ? sent.get(proposal.redLineId) : undefined;
    if (!proposal || !redLine) {
      verification.redLineMatchesDroppedInvalid++;
      continue;
    }
    const citation = locateCitation(text, proposal.quote);
    if (!citation) {
      verification.redLineMatchesDroppedNoSource++;
      continue;
    }
    const key = `${redLine.id}|${citation.start}:${citation.end}`;
    if (bySpan.has(key)) {
      verification.redLineMatchesDroppedDuplicate++;
      continue;
    }

    let explanation = proposal.explanation;
    if (explanation === null || !checkRedLineExplanation(explanation, citation.text, redLine.text).supported) {
      verification.redLineExplanationsReplaced++;
      explanation = FALLBACK_RED_LINE_EXPLANATION;
    }
    bySpan.set(key, { redLine: { id: redLine.id, text: redLine.text }, citation, explanation });
  }

  const rank = (match: RedLineMatch) => order.findIndex((alias) => sent.get(alias)?.id === match.redLine.id);
  const matches = [...bySpan.values()].sort(
    (a, b) => a.citation.start - b.citation.start || a.citation.end - b.citation.end || rank(a) - rank(b),
  );
  verification.redLineMatchesKept = matches.length;
  return matches;
}

interface MatchProposal {
  redLineId: string;
  quote: string;
  /** Null when the model left it blank; it is then replaced. */
  explanation: string | null;
}

function readMatchProposal(value: unknown): MatchProposal | null {
  if (!isRecord(value)) return null;
  const redLineId = nonEmptyString(value.redLineId);
  const quote = nonEmptyString(value.quote);
  if (redLineId === null || quote === null || typeof value.explanation !== "string") return null;
  return { redLineId, quote, explanation: nonEmptyString(value.explanation) };
}

interface Proposal {
  quote: string;
  clauseType: string;
  severity: SeverityTier;
  axis: SeverityAxis;
  rationale: string;
}

function readProposal(value: unknown): Proposal | null {
  if (!isRecord(value)) return null;
  const quote = nonEmptyString(value.quote);
  const clauseType = nonEmptyString(value.clauseType);
  const rationale = nonEmptyString(value.rationale);
  const severity = SEVERITY_TIERS.find((tier) => tier === value.severity);
  const axis = SEVERITY_AXES.find((a) => a === value.axis);
  if (quote === null || clauseType === null || rationale === null || !severity || !axis) return null;
  return { quote, clauseType, severity, axis, rationale };
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function tierRank(tier: SeverityTier): number {
  return SEVERITY_TIERS.indexOf(tier);
}
