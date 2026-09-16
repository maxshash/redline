import type { ModelClient } from "@/lib/model/client";
import {
  COUNTER_OFFER_SCHEMA,
  COUNTER_OFFER_SCHEMA_NAME,
  COUNTER_OFFER_SYSTEM_PROMPT,
  counterOfferUserMessage,
  type CounterOfferRequestFlag,
} from "./prompt";
import type { CounterOffer, Flag, FlagWithCounterOffer } from "./types";

export interface DraftCounterOffersDeps {
  model: ModelClient;
  /** Where a failed drafting call is reported. Defaults to console.error. */
  log?: (message: string) => void;
}

/**
 * Draft a counter-offer for each flag, in one model call.
 *
 * This is the only way a counter-offer is made, and it takes `Flag` values
 * only. A `Flag` holds a `Citation`, and a `Citation` only comes from
 * `locateCitation`, so nothing uncited can reach this call (ADR 0001). As a
 * second guard, a flag whose citation isn't the matching span of
 * `documentText` isn't sent, and gets "unavailable".
 *
 * The model's output is untrusted. Answers are keyed back to flags by the
 * `flagId` sent with each one; answers for ids that weren't sent are ignored,
 * and the first usable answer for an id wins. A flag with no usable answer
 * (the call failed, the output was malformed, the flag was skipped, or the
 * language was empty) gets "unavailable". This never throws for a model
 * failure: the flags and their citations stand on their own.
 *
 * Returns one entry per input flag, in input order. With no flags to send,
 * no call is made.
 */
export async function draftCounterOffers(
  documentText: string,
  flags: readonly Flag[],
  deps: DraftCounterOffersDeps,
): Promise<FlagWithCounterOffer[]> {
  const log = deps.log ?? ((message: string) => console.error(message));

  const sent = new Map<string, number>();
  const requestFlags: CounterOfferRequestFlag[] = [];
  flags.forEach((flag, index) => {
    if (documentText.slice(flag.citation.start, flag.citation.end) !== flag.citation.text) return;
    const flagId = `flag-${index + 1}`;
    sent.set(flagId, index);
    requestFlags.push({
      flagId,
      clauseType: flag.clauseType,
      quote: flag.citation.text,
      reason: flag.rationale,
    });
  });

  const drafted = new Map<number, CounterOffer>();
  if (requestFlags.length > 0) {
    let output: unknown;
    try {
      output = await deps.model.completeJson({
        name: COUNTER_OFFER_SCHEMA_NAME,
        system: COUNTER_OFFER_SYSTEM_PROMPT,
        user: counterOfferUserMessage(documentText, requestFlags),
        schema: COUNTER_OFFER_SCHEMA,
      });
    } catch (error) {
      log(`[counter-offers] model call failed: ${describe(error)}`);
      output = undefined;
    }

    const answers = isRecord(output) && Array.isArray(output.counterOffers) ? output.counterOffers : null;
    if (output !== undefined && answers === null) log("[counter-offers] the model's output had no counterOffers list");

    for (const answer of answers ?? []) {
      if (!isRecord(answer) || typeof answer.flagId !== "string") continue;
      const index = sent.get(answer.flagId);
      if (index === undefined || drafted.has(index)) continue;
      const proposedLanguage = typeof answer.proposedLanguage === "string" ? answer.proposedLanguage.trim() : "";
      if (proposedLanguage.length === 0) continue;
      const note = typeof answer.note === "string" ? answer.note.trim() : "";
      drafted.set(index, note.length > 0 ? { status: "drafted", proposedLanguage, note } : { status: "drafted", proposedLanguage });
    }
  }

  return flags.map((flag, index) => ({ ...flag, counterOffer: drafted.get(index) ?? { status: "unavailable" } }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const kind = "kind" in error ? ` (${String((error as { kind: unknown }).kind)})` : "";
    return `${error.name}${kind}: ${error.message}`;
  }
  return String(error);
}
