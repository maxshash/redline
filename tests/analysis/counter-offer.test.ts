import { describe, expect, it } from "vitest";
import { analyzeDocument, type AnalyzeDeps } from "@/lib/analysis/analyze";
import type { Citation } from "@/lib/analysis/citation";
import { draftCounterOffers } from "@/lib/analysis/counter-offer";
import type { Analysis, CounterOffer, Flag, FlagWithCounterOffer } from "@/lib/analysis/types";
import { expectCitationsVerbatim } from "../support/citations";
import { loadFixture, type Fixture, type FixtureName, type PlantedClause } from "../support/fixtures";
import {
  FABRICATED_QUOTE,
  counterOfferFlagsIn,
  counterOfferRequests,
  stubModel,
  type StubFaults,
  type StubModel,
} from "../support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-agreement");
const planted = (id: string): PlantedClause => {
  const clause = adhesion.sidecar.plantedClauses.find((c) => c.id === id);
  if (!clause) throw new Error(`no planted clause ${id}`);
  return clause;
};

interface Run {
  analysis: Analysis;
  model: StubModel;
  logs: string[];
}

/** The real analysis, stubbed model, with citation integrity checked on every result. */
async function analyze(name: FixtureName, faults: StubFaults = {}): Promise<Run> {
  const fixture = loadFixture(name);
  const model = stubModel(faults);
  const logs: string[] = [];
  const deps: AnalyzeDeps = { model, log: (message) => logs.push(message) };
  const analysis = await analyzeDocument(fixture.text, deps);
  expectCitationsVerbatim(
    fixture.text,
    analysis.flags.map((flag) => flag.citation),
  );
  return { analysis, model, logs };
}

/** The flag whose citation covers this planted sentence. */
function flagFor(fixture: Fixture, analysis: Analysis, clause: PlantedClause): FlagWithCounterOffer {
  const start = fixture.text.indexOf(clause.sentence);
  const end = start + clause.sentence.length;
  const flag = analysis.flags.find((f) => f.citation.start <= start && f.citation.end >= end);
  if (!flag) throw new Error(`no flag for ${clause.id}`);
  return flag;
}

function expectDraftedFromSidecar(run: Run, except: readonly string[] = []) {
  for (const clause of adhesion.sidecar.plantedClauses) {
    if (except.includes(clause.id)) continue;
    expect(flagFor(adhesion, run.analysis, clause).counterOffer, clause.id).toEqual({
      status: "drafted",
      proposedLanguage: clause.counterOffer,
    });
  }
}

describe("counter-offers on a flagged document", () => {
  it("gives every flag a drafted counter-offer, from one call made after verification", async () => {
    const run = await analyze("adhesion-contract");
    const { analysis, model } = run;

    expect(analysis.flags).toHaveLength(8);
    expectDraftedFromSidecar(run);
    expect(analysis.verification).toMatchObject({ kept: 8, counterOffersDrafted: 8, counterOffersUnavailable: 0 });

    // Analysis first, then exactly one counter-offer call carrying the kept flags' citations.
    expect(model.requests).toHaveLength(2);
    expect(counterOfferRequests(model)).toEqual([model.requests[1]]);
    const sent = counterOfferFlagsIn(model.requests[1]).map((flag) => flag.quote);
    expect(sent.sort()).toEqual(analysis.flags.map((flag) => flag.citation.text).sort());
  });

  it("never sends a quote dropped at verification to the counter-offer call", async () => {
    const indemnity = planted("uncapped-indemnity");
    const { analysis, model } = await analyze("adhesion-contract", {
      fabricatedQuote: true,
      curlyQuoteMarks: indemnity.id,
    });
    expect(analysis.verification).toMatchObject({ proposed: 9, kept: 7, droppedNoSource: 2 });

    const [request] = counterOfferRequests(model);
    const sent = counterOfferFlagsIn(request);
    expect(sent).toHaveLength(7);
    expect(model.requests).toHaveLength(2);
    expect(sent.map((flag) => flag.quote)).not.toContain(FABRICATED_QUOTE);
    expect(request.user).not.toContain(FABRICATED_QUOTE);
    expect(request.user).not.toContain("cancellation fee");
    // Neither the curled copy nor the sentence it failed to match was sent.
    for (const flag of sent) {
      expect(adhesion.text.includes(flag.quote)).toBe(true);
      expect(flag.quote.includes(indemnity.sentence)).toBe(false);
    }
    expect(analysis.flags.map((flag) => flag.clauseType)).not.toContain("early-exit-fee");
  });

  it("makes no counter-offer call for a document with no flags", async () => {
    const { analysis, model } = await analyze("clean-agreement");
    expect(analysis.flags).toEqual([]);
    expect(model.requests).toHaveLength(1);
    expect(counterOfferRequests(model)).toEqual([]);
    expect(analysis.verification).toMatchObject({ counterOffersDrafted: 0, counterOffersUnavailable: 0 });
  });

  it("makes no counter-offer call when every proposed flag was dropped", async () => {
    // Every planted clause is left out, so only the fabricated quote is proposed, and it fails.
    const omit = adhesion.sidecar.plantedClauses.map((clause) => clause.id);
    const { analysis, model } = await analyze("adhesion-contract", { omit, fabricatedQuote: true });
    expect(analysis.verification).toMatchObject({ proposed: 1, kept: 0, droppedNoSource: 1 });
    expect(counterOfferRequests(model)).toEqual([]);
  });
});

describe("when drafting goes wrong", () => {
  it("keeps the whole analysis when the counter-offer call throws, with every counter-offer unavailable", async () => {
    const reference = await analyze("adhesion-contract");
    const { analysis, logs } = await analyze("adhesion-contract", { counterOfferThrows: true });

    expect(analysis.summary).toBe(adhesion.sidecar.summary);
    expect(analysis.flags.map(({ counterOffer: _, ...flag }) => flag)).toEqual(
      reference.analysis.flags.map(({ counterOffer: _, ...flag }) => flag),
    );
    for (const flag of analysis.flags) expect(flag.counterOffer).toEqual({ status: "unavailable" });
    expect(analysis.verification).toMatchObject({ kept: 8, counterOffersDrafted: 0, counterOffersUnavailable: 8 });
    expect(logs.join("\n")).toContain("simulated counter-offer failure");
  });

  it("treats output with no counterOffers list as unavailable for every flag", async () => {
    const { analysis, logs } = await analyze("adhesion-contract", { counterOfferNoList: true });
    expect(analysis.flags).toHaveLength(8);
    for (const flag of analysis.flags) expect(flag.counterOffer).toEqual({ status: "unavailable" });
    expect(analysis.verification).toMatchObject({ counterOffersDrafted: 0, counterOffersUnavailable: 8 });
    expect(logs).toHaveLength(1);
  });

  it("marks only a skipped flag unavailable", async () => {
    const skipped = planted("non-compete-non-solicit");
    const run = await analyze("adhesion-contract", { counterOfferOmit: [skipped.id] });
    expect(flagFor(adhesion, run.analysis, skipped).counterOffer).toEqual({ status: "unavailable" });
    expectDraftedFromSidecar(run, [skipped.id]);
    expect(run.analysis.verification).toMatchObject({ kept: 8, counterOffersDrafted: 7, counterOffersUnavailable: 1 });
  });

  it("marks only a flag with blank language unavailable", async () => {
    const blank = planted("auto-renewal");
    const run = await analyze("adhesion-contract", { counterOfferEmpty: blank.id });
    expect(flagFor(adhesion, run.analysis, blank).counterOffer).toEqual({ status: "unavailable" });
    expectDraftedFromSidecar(run, [blank.id]);
    expect(run.analysis.verification).toMatchObject({ counterOffersDrafted: 7, counterOffersUnavailable: 1 });
  });

  it("ignores an answer for a flag id that wasn't sent", async () => {
    const misfiled = planted("fee-escalator");
    const run = await analyze("adhesion-contract", { counterOfferUnknownId: misfiled.id });
    expect(flagFor(adhesion, run.analysis, misfiled).counterOffer).toEqual({ status: "unavailable" });
    // Its language isn't attached to some other flag either.
    for (const flag of run.analysis.flags) {
      if (flag.counterOffer.status === "drafted") expect(flag.counterOffer.proposedLanguage).not.toBe(misfiled.counterOffer);
    }
    expectDraftedFromSidecar(run, [misfiled.id]);
    expect(run.analysis.verification).toMatchObject({ counterOffersDrafted: 7, counterOffersUnavailable: 1 });
  });
});

describe("draftCounterOffers", () => {
  it("won't send flags whose citations aren't spans of the document it was given", async () => {
    const { analysis } = await analyze("adhesion-contract");
    const flags: Flag[] = analysis.flags.map(({ counterOffer: _, ...flag }) => flag);
    const model = stubModel();

    const result = await draftCounterOffers(clean.text, flags, { model, log: () => {} });

    expect(model.requests).toEqual([]);
    expect(result).toHaveLength(flags.length);
    for (const flag of result) expect(flag.counterOffer).toEqual({ status: "unavailable" });
  });
});

describe("data model", () => {
  it("has no way to draft or hold a counter-offer without a verified citation", () => {
    const text = adhesion.text;
    const sentence = planted("auto-renewal").sentence;
    const drafted: CounterOffer = { status: "drafted", proposedLanguage: "Either Party may decline to renew." };
    const model = stubModel();

    // Never called: these only need to fail to compile.
    const attempts = [
      () =>
        draftCounterOffers(
          text,
          // @ts-expect-error A plain string is not a Citation.
          [{ citation: sentence, clauseType: "auto-renewal", severity: "critical", axis: "both", rationale: "Easy to miss." }],
          { model },
        ),
      () =>
        draftCounterOffers(
          text,
          // @ts-expect-error A hand-built span is not a Citation either; only locateCitation makes one.
          [{ citation: { text: sentence, start: 0, end: 1 }, clauseType: "auto-renewal", severity: "critical", axis: "both", rationale: "Easy to miss." }],
          { model },
        ),
      () =>
        draftCounterOffers(
          text,
          // @ts-expect-error A flag with no citation can't be sent for drafting.
          [{ clauseType: "auto-renewal", severity: "critical", axis: "both", rationale: "Easy to miss." }],
          { model },
        ),
    ];

    const stringCited: FlagWithCounterOffer = {
      // @ts-expect-error A flag with a counter-offer still needs a Citation, not a string.
      citation: sentence,
      clauseType: "auto-renewal",
      severity: "critical",
      axis: "both",
      rationale: "Easy to miss.",
      counterOffer: drafted,
    };
    // @ts-expect-error A flag with a counter-offer can't leave its citation out.
    const uncited: FlagWithCounterOffer = {
      clauseType: "auto-renewal",
      severity: "critical",
      axis: "both",
      rationale: "Easy to miss.",
      counterOffer: drafted,
    };
    // @ts-expect-error A drafted counter-offer has language.
    const empty: CounterOffer = { status: "drafted" };
    // @ts-expect-error A Citation can't be cast from a string without going through unknown.
    const cast = sentence as Citation;

    expect([attempts, stringCited, uncited, empty, cast]).toHaveLength(5);
  });
});
