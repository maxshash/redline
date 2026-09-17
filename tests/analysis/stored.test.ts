import { describe, expect, it } from "vitest";
import {
  hydrateAnalysis,
  hydrateStoredAnalysis,
  prepareAnalysisRecord,
  serializeAnalysis,
  serializeRedLinesUsed,
  type StoredAnalysis,
} from "@/lib/analysis/stored";
import { analyzeFixture, jsonCopy } from "../support/analyses";
import { expectCitationsVerbatim } from "../support/citations";
import { FIXTURE_NAMES, loadFixture } from "../support/fixtures";

/**
 * The trust boundary for analyses at rest. What goes in is a real analysis
 * from the pipeline (stub model, real verification); what is tampered with is
 * the stored JSON, the way a hand-edited row or a forged save payload would be.
 */

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-agreement");

async function storedAdhesion() {
  const run = await analyzeFixture("adhesion-contract");
  return { ...run, json: jsonCopy(serializeAnalysis(run.analysis)) as StoredAnalysis & Record<string, unknown> };
}

function expectRejected(documentText: string, json: unknown, problem: string) {
  const result = hydrateAnalysis(documentText, json);
  expect(result.ok, "a tampered analysis must not hydrate").toBe(false);
  if (!result.ok) expect(result.problem).toBe(problem);
}

describe("serialise → hydrate round trip", () => {
  it.each(FIXTURE_NAMES)("gives back the same analysis for %s, with every citation verbatim", async (name) => {
    const { fixture, analysis, redLines } = await analyzeFixture(name);
    // The planted fixture has flags, counter-offers and matches; the clean one has matches and no flags.
    if (name === "adhesion-contract") expect(analysis.flags.length).toBeGreaterThan(0);
    expect(analysis.redLineMatches.length).toBeGreaterThan(0);

    const hydrated = hydrateAnalysis(fixture.text, jsonCopy(serializeAnalysis(analysis)));
    if (!hydrated.ok) throw new Error(`expected it to hydrate, got ${hydrated.problem} at ${hydrated.path}`);
    expect(hydrated.analysis).toEqual(analysis);
    expectCitationsVerbatim(fixture.text, hydrated.analysis);

    const both = hydrateStoredAnalysis(fixture.text, jsonCopy({ result: serializeAnalysis(analysis), redLinesUsed: serializeRedLinesUsed(redLines) }));
    expect(both).toEqual({ ok: true, analysis, redLinesUsed: redLines });
  });

  it("keeps an unavailable counter-offer and a drafted one with a note apart", async () => {
    const { analysis } = await analyzeFixture("adhesion-contract");
    const mixed = {
      ...analysis,
      flags: analysis.flags.map((flag, i) =>
        i === 0
          ? { ...flag, counterOffer: { status: "unavailable" as const } }
          : i === 1
            ? { ...flag, counterOffer: { status: "drafted" as const, proposedLanguage: "Either party may end this on 30 days' notice.", note: "Ask for mutual terms." } }
            : flag,
      ),
      verification: {
        ...analysis.verification,
        counterOffersDrafted: analysis.verification.counterOffersDrafted - 1,
        counterOffersUnavailable: analysis.verification.counterOffersUnavailable + 1,
      },
    };
    const hydrated = hydrateAnalysis(adhesion.text, jsonCopy(serializeAnalysis(mixed)));
    expect(hydrated).toEqual({ ok: true, analysis: mixed });
  });
});

describe("hydrateAnalysis rejects", () => {
  it("a tampered quote, even with its span left alone", async () => {
    const { json } = await storedAdhesion();
    json.flags[0].citation.text = json.flags[0].citation.text.replace(/\b(\w)/, (c) => (c === "X" ? "Y" : "X"));
    expectRejected(adhesion.text, json, "citation-mismatch");
  });

  it("a quote rewritten to something the document doesn't say, span resized to fit", async () => {
    const { json } = await storedAdhesion();
    const invented = "Client may end this Agreement at any time without paying for work already done.";
    expect(adhesion.text.includes(invented)).toBe(false);
    json.flags[0].citation = { ...json.flags[0].citation, text: invented, end: json.flags[0].citation.start + invented.length };
    expectRejected(adhesion.text, json, "citation-mismatch");
  });

  it("a shifted start and end", async () => {
    const { json } = await storedAdhesion();
    json.flags[1].citation.start += 1;
    json.flags[1].citation.end += 1;
    expectRejected(adhesion.text, json, "citation-mismatch");
  });

  it("a red-line match whose span was moved", async () => {
    const { json } = await storedAdhesion();
    json.redLineMatches[0].citation.end -= 1;
    expectRejected(adhesion.text, json, "citation-mismatch");
  });

  it("a hydrate against a different document's text", async () => {
    const { json } = await storedAdhesion();
    expectRejected(clean.text, json, "citation-mismatch");
  });

  it("an invalid tier", async () => {
    const { json } = await storedAdhesion();
    json.flags[0].severity = "high";
    expectRejected(adhesion.text, json, "invalid-tier");
  });

  it("an invalid axis", async () => {
    const { json } = await storedAdhesion();
    json.flags[0].axis = "expensive";
    expectRejected(adhesion.text, json, "invalid-tier");
  });

  it("a counter-offer on a flag whose citation is missing", async () => {
    const { json } = await storedAdhesion();
    const flag = json.flags[0] as unknown as Record<string, unknown>;
    delete flag.citation;
    expect(flag.counterOffer).toMatchObject({ status: "drafted" });
    expectRejected(adhesion.text, json, "invalid-counter-offer");
  });

  it("a counter-offer attached to a red-line match", async () => {
    const { json } = await storedAdhesion();
    (json.redLineMatches[0] as unknown as Record<string, unknown>).counterOffer = {
      status: "drafted",
      proposedLanguage: "Remove this clause.",
    };
    expectRejected(adhesion.text, json, "invalid-counter-offer");
  });

  it("a counter-offer that is neither drafted nor unavailable", async () => {
    const { json } = await storedAdhesion();
    (json.flags[0] as unknown as Record<string, unknown>).counterOffer = { status: "maybe", proposedLanguage: "x" };
    expectRejected(adhesion.text, json, "invalid-counter-offer");
  });

  it.each([
    ["on a flag", (json: StoredAnalysis) => Object.assign(json.flags[0], { score: 8 })],
    ["on the analysis", (json: StoredAnalysis) => Object.assign(json, { riskScore: 72 })],
    ["on a red-line match", (json: StoredAnalysis) => Object.assign(json.redLineMatches[0], { severityRank: 1 })],
    ["as the severity itself", (json: StoredAnalysis) => Object.assign(json.flags[0], { severity: 3 })],
  ])("a numeric score %s", async (_label, tamper) => {
    const { json } = await storedAdhesion();
    tamper(json);
    expectRejected(adhesion.text, json, "numeric-score");
  });

  it("an unknown field", async () => {
    const { json } = await storedAdhesion();
    Object.assign(json.flags[0], { source: "the model said so" });
    expectRejected(adhesion.text, json, "unknown-field");
  });

  it("verification counts that don't describe the flags", async () => {
    const { json } = await storedAdhesion();
    json.flags.pop();
    expectRejected(adhesion.text, json, "inconsistent-counts");
  });

  it.each([
    ["null", null],
    ["a string", "{}"],
    ["an array", []],
    ["another version", { version: 2 }],
  ])("%s instead of an analysis", async (_label, value) => {
    const { json } = await storedAdhesion();
    const input = value !== null && typeof value === "object" && !Array.isArray(value) ? { ...json, ...value } : value;
    expectRejected(adhesion.text, input, "invalid-shape");
  });
});

describe("red lines used", () => {
  it("rejects a match naming a red line the analysis didn't run with", async () => {
    const { analysis, redLines } = await analyzeFixture("adhesion-contract");
    const result = hydrateStoredAnalysis(
      adhesion.text,
      jsonCopy({ result: serializeAnalysis(analysis), redLinesUsed: serializeRedLinesUsed(redLines.slice(1)) }),
    );
    expect(result).toMatchObject({ ok: false, problem: "unknown-red-line" });
  });

  it("prepares a record only for an analysis that verifies against the text it will be stored with", async () => {
    const { analysis, redLines } = await analyzeFixture("adhesion-contract");
    const good = prepareAnalysisRecord(adhesion.text, analysis, redLines);
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.record.result).toEqual(serializeAnalysis(analysis));
      expect(good.record.redLinesUsed).toEqual(redLines);
    }
    expect(prepareAnalysisRecord(clean.text, analysis, redLines)).toMatchObject({ ok: false, problem: "citation-mismatch" });
  });
});
