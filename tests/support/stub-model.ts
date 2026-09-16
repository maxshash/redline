import {
  COUNTER_OFFER_FLAGS_END,
  COUNTER_OFFER_FLAGS_START,
  COUNTER_OFFER_SCHEMA_NAME,
  RED_LINES_END,
  RED_LINES_START,
  type CounterOfferRequestFlag,
  type RedLineRequestEntry,
} from "@/lib/analysis/prompt";
import type { JsonRequest, ModelClient } from "@/lib/model/client";
import { FIXTURE_NAMES, loadFixture, type Fixture, type PlantedClause } from "./fixtures";

/**
 * Faults a test can inject into the stub's payload. Clause faults name a
 * planted clause by its sidecar `id`.
 */
export interface StubFaults {
  /** Add a flag whose quote is not in the document. */
  fabricatedQuote?: boolean;
  /** Quote this clause together with the paragraph before it, with the line breaks between them turned into spaces. */
  lineBreakAsSpace?: string;
  /** Swap this clause's straight quote marks and apostrophes for curly ones. */
  curlyQuoteMarks?: string;
  /** Return this clause twice; optionally the copy carries another tier. */
  duplicate?: { id: string; severity?: string };
  /** Give this clause a tier that doesn't exist. */
  badSeverity?: string;
  /** Leave a field off this clause. */
  missingField?: { id: string; field: "quote" | "clauseType" | "severity" | "axis" | "rationale" };
  /** Add a figure to this clause's rationale that its sentence doesn't contain. */
  inventedFigure?: string;
  /** Leave these clauses out of the payload entirely. */
  omit?: string[];
  /** Replace the whole payload. */
  output?: "not-json" | "no-summary" | "no-flags" | "no-red-line-matches";

  /** Red-line matches: add a match naming a red line id that wasn't sent. */
  redLineUnknownId?: boolean;
  /** Red-line matches: add a match for the first red line sent, quoting a sentence that isn't in the document. */
  redLineFabricatedQuote?: boolean;
  /** Red-line matches: give the match for this red line (by its text) an explanation with a figure nobody wrote. */
  redLineInventedFigure?: string;
  /** Red-line matches: return the match for this red line (by its text) twice. */
  redLineDuplicate?: string;
  /** Throw instead of answering. */
  throws?: boolean;

  /** Counter-offer call: throw instead of answering. */
  counterOfferThrows?: boolean;
  /** Counter-offer call: leave these clauses' answers out. */
  counterOfferOmit?: string[];
  /** Counter-offer call: answer this clause under a flag id that wasn't sent. */
  counterOfferUnknownId?: string;
  /** Counter-offer call: answer this clause with blank language. */
  counterOfferEmpty?: string;
  /** Counter-offer call: return an object with no counterOffers list. */
  counterOfferNoList?: boolean;
}

/** The quote the `fabricatedQuote` fault adds. It is in neither fixture. */
export const FABRICATED_QUOTE =
  "Consultant shall pay Client a cancellation fee of five thousand dollars ($5,000) if Consultant ends this Agreement early.";

export interface StubModel extends ModelClient {
  /** Every request, in order: analysis and counter-offer calls alike. */
  requests: JsonRequest[];
  /** Which fixture the last request carried. */
  lastFixture: Fixture | null;
}

/**
 * A model stand-in built from the fixture sidecars. It works out which fixture
 * it was sent by finding the fixture's text in the request, never by reading
 * the prompt's wording, then answers with that sidecar's summary and one flag
 * per planted clause, in sidecar order (which is not document order).
 *
 * It answers red-line matches from the sidecar's `redLineCases`: it reads the
 * red lines out of the request's delimited JSON block and, for each one whose
 * text is a sidecar case, returns that case's matching sentence under the id
 * it was sent. Red lines it doesn't know get no match.
 *
 * It tells the counter-offer request from the analysis request by the JSON
 * schema name, and answers it with the sidecar's `counterOffer` for each flag
 * whose cited text covers a planted sentence, keyed by the flag ids it was sent.
 */
export function stubModel(faults: StubFaults = {}): StubModel {
  const fixtures = FIXTURE_NAMES.map(loadFixture);
  const stub: StubModel = {
    requests: [],
    lastFixture: null,
    async completeJson(request) {
      stub.requests.push(request);
      const fixture = fixtures.find((f) => request.user.includes(f.text));
      if (!fixture) throw new Error("stub model: the request didn't contain a known fixture document");
      stub.lastFixture = fixture;

      if (request.name === COUNTER_OFFER_SCHEMA_NAME) return answerCounterOffers(fixture, request, faults);

      if (faults.throws) throw new Error("stub model: simulated failure");
      if (faults.output === "not-json") return "Sorry, I can't help with that.";

      const flags: Record<string, unknown>[] = [];
      for (const clause of fixture.sidecar.plantedClauses) {
        if (faults.omit?.includes(clause.id)) continue;
        const flag: Record<string, unknown> = {
          quote: clause.sentence,
          clauseType: clause.type,
          severity: clause.expectedSeverity,
          axis: clause.axis,
          rationale: clause.rationale,
        };

        if (faults.lineBreakAsSpace === clause.id) flag.quote = withPreviousParagraph(fixture.text, clause);
        if (faults.curlyQuoteMarks === clause.id) flag.quote = curl(clause.sentence);
        if (faults.badSeverity === clause.id) flag.severity = "high";
        if (faults.missingField?.id === clause.id) delete flag[faults.missingField.field];
        if (faults.inventedFigure === clause.id) flag.rationale = inventFigure(clause);

        flags.push(flag);
        if (faults.duplicate?.id === clause.id) {
          flags.push({ ...flag, severity: faults.duplicate.severity ?? flag.severity });
        }
      }

      if (faults.fabricatedQuote) {
        flags.push({
          quote: FABRICATED_QUOTE,
          clauseType: "early-exit-fee",
          severity: "critical",
          axis: "both",
          rationale: "Easy to miss and hard to undo.",
        });
      }

      const redLineMatches = answerRedLines(fixture, request, faults);

      if (faults.output === "no-summary") return { flags, redLineMatches };
      if (faults.output === "no-flags") return { summary: fixture.sidecar.summary, redLineMatches };
      if (faults.output === "no-red-line-matches") return { summary: fixture.sidecar.summary, flags };
      return { summary: fixture.sidecar.summary, flags, redLineMatches };
    },
  };
  return stub;
}

/** The red lines an analysis request sent to the model. */
export function redLinesIn(request: JsonRequest): RedLineRequestEntry[] {
  const start = request.user.lastIndexOf(RED_LINES_START);
  const end = request.user.lastIndexOf(RED_LINES_END);
  if (start === -1 || end < start) throw new Error("stub model: the analysis request carried no red lines block");
  return JSON.parse(request.user.slice(start + RED_LINES_START.length, end)) as RedLineRequestEntry[];
}

/** The explanation the stub gives a match. It asserts no figures. */
export const STUB_MATCH_EXPLANATION = "This clause is about what the red line names.";

function answerRedLines(fixture: Fixture, request: JsonRequest, faults: StubFaults) {
  const sent = redLinesIn(request);
  const matches: { redLineId: string; quote: string; explanation: string }[] = [];
  for (const redLine of sent) {
    const found = fixture.sidecar.redLineCases.find((c) => c.redLine === redLine.text);
    if (!found) continue;
    const match = { redLineId: redLine.redLineId, quote: found.matchingSentence, explanation: STUB_MATCH_EXPLANATION };
    if (faults.redLineInventedFigure === redLine.text) {
      if (/\b90\b|ninety/i.test(found.matchingSentence + redLine.text)) throw new Error("stub model: pick another invented figure");
      match.explanation = "That leaves you exposed for about 90 days.";
    }
    matches.push(match);
    if (faults.redLineDuplicate === redLine.text) matches.push({ ...match });
  }
  if (faults.redLineUnknownId) {
    const known = fixture.sidecar.redLineCases[0];
    matches.push({ redLineId: "red-line-999", quote: known.matchingSentence, explanation: STUB_MATCH_EXPLANATION });
  }
  if (faults.redLineFabricatedQuote && sent.length > 0) {
    matches.push({ redLineId: sent[0].redLineId, quote: FABRICATED_QUOTE, explanation: STUB_MATCH_EXPLANATION });
  }
  return matches;
}

/** The flags a counter-offer request sent to the model. */
export function counterOfferFlagsIn(request: JsonRequest): CounterOfferRequestFlag[] {
  const start = request.user.lastIndexOf(COUNTER_OFFER_FLAGS_START);
  const end = request.user.lastIndexOf(COUNTER_OFFER_FLAGS_END);
  if (start === -1 || end < start) throw new Error("stub model: the counter-offer request carried no flags block");
  return JSON.parse(request.user.slice(start + COUNTER_OFFER_FLAGS_START.length, end)) as CounterOfferRequestFlag[];
}

/** The counter-offer requests among everything the stub was sent. */
export function counterOfferRequests(stub: StubModel): JsonRequest[] {
  return stub.requests.filter((request) => request.name === COUNTER_OFFER_SCHEMA_NAME);
}

function answerCounterOffers(fixture: Fixture, request: JsonRequest, faults: StubFaults) {
  if (faults.counterOfferThrows) throw new Error("stub model: simulated counter-offer failure");
  if (faults.counterOfferNoList) return { drafts: "none" };

  const counterOffers: { flagId: string; proposedLanguage: string; note: string }[] = [];
  for (const flag of counterOfferFlagsIn(request)) {
    // A quote that has turned line breaks into spaces still covers its sentence.
    const quote = flag.quote.replace(/\s+/g, " ");
    const clause = fixture.sidecar.plantedClauses.find((c) => quote.includes(c.sentence.replace(/\s+/g, " ")));
    if (!clause || faults.counterOfferOmit?.includes(clause.id)) continue;
    counterOffers.push({
      flagId: faults.counterOfferUnknownId === clause.id ? "flag-unknown" : flag.flagId,
      proposedLanguage: faults.counterOfferEmpty === clause.id ? "  " : clause.counterOffer,
      note: "",
    });
  }
  return { counterOffers };
}

/** The planted sentence and the paragraph before it, joined by one space instead of the blank line. */
function withPreviousParagraph(text: string, clause: PlantedClause): string {
  const start = text.indexOf(clause.sentence);
  const paragraphStart = text.lastIndexOf("\n\n", start);
  const previousStart = text.lastIndexOf("\n\n", paragraphStart - 1) + 2;
  const span = text.slice(previousStart, start + clause.sentence.length);
  const quote = span.replace(/\s+/g, " ");
  if (!/\n/.test(span) || quote === span) throw new Error(`stub model: no line break to replace before ${clause.id}`);
  return quote;
}

function curl(sentence: string): string {
  let open = true;
  const curled = sentence.replace(/'/g, "’").replace(/"/g, () => ((open = !open) ? "”" : "“"));
  if (curled === sentence) throw new Error("stub model: the sentence has no straight quote marks to swap");
  return curled;
}

function inventFigure(clause: PlantedClause): string {
  if (/\b90\b|ninety/i.test(clause.sentence)) throw new Error("stub model: pick another invented figure");
  return `${clause.rationale} In practice that means about 90 days of exposure.`;
}
