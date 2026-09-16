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
  output?: "not-json" | "no-summary" | "no-flags";
  /** Throw instead of answering. */
  throws?: boolean;
}

export interface StubModel extends ModelClient {
  requests: JsonRequest[];
  /** Which fixture the last request carried. */
  lastFixture: Fixture | null;
}

/**
 * A model stand-in built from the fixture sidecars. It works out which fixture
 * it was sent by finding the fixture's text in the request, never by reading
 * the prompt's wording, then answers with that sidecar's summary and one flag
 * per planted clause, in sidecar order (which is not document order).
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
          quote: "Consultant shall pay Client a cancellation fee of five thousand dollars ($5,000) if Consultant ends this Agreement early.",
          clauseType: "early-exit-fee",
          severity: "critical",
          axis: "both",
          rationale: "Easy to miss and hard to undo.",
        });
      }

      if (faults.output === "no-summary") return { flags };
      if (faults.output === "no-flags") return { summary: fixture.sidecar.summary };
      return { summary: fixture.sidecar.summary, flags };
    },
  };
  return stub;
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
