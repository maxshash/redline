import { describe, expect, it } from "vitest";
import { AnalysisError, analyzeDocument } from "@/lib/analysis/analyze";
import { locateCitation, type Citation } from "@/lib/citations/citation";
import { ANALYSIS_SCHEMA, ANALYSIS_SCHEMA_NAME } from "@/lib/analysis/prompt";
import { groupRedLineMatches } from "@/lib/analysis/red-line-groups";
import type { Analysis, RedLineMatch, RedLineRef } from "@/lib/analysis/types";
import { FALLBACK_RED_LINE_EXPLANATION, checkRedLineExplanation } from "@/lib/analysis/voice";
import { figuresIn } from "@/lib/citations/support";
import { expectCitationsVerbatim } from "../support/citations";
import { FIXTURE_NAMES, loadFixture, type Fixture, type FixtureName } from "../support/fixtures";
import { redLineCasesFound, sidecarRedLines } from "../support/red-lines";
import {
  FABRICATED_QUOTE,
  STUB_MATCH_EXPLANATION,
  counterOfferFlagsIn,
  counterOfferRequests,
  redLinesIn,
  stubModel,
  type StubFaults,
  type StubModel,
} from "../support/stub-model";

const adhesion = loadFixture("adhesion-contract");

interface Run {
  fixture: Fixture;
  analysis: Analysis;
  model: StubModel;
}

/** The real analysis with a stubbed model, and citation integrity checked on flags and matches alike. */
async function analyze(name: FixtureName, redLines: readonly RedLineRef[], faults: StubFaults = {}): Promise<Run> {
  const fixture = loadFixture(name);
  const model = stubModel(faults);
  const analysis = await analyzeDocument(fixture.text, redLines, { model, log: () => {} });
  expectCitationsVerbatim(fixture.text, analysis);
  return { fixture, analysis, model };
}

/** Flags without their counter-offers' identity, for comparing two runs. */
function flagSnapshot(analysis: Analysis) {
  return analysis.flags.map((flag) => ({
    text: flag.citation.text,
    start: flag.citation.start,
    severity: flag.severity,
    axis: flag.axis,
    clauseType: flag.clauseType,
    rationale: flag.rationale,
  }));
}

describe("red-line match completeness", () => {
  it.each(FIXTURE_NAMES)("%s: every red-line case is reported with a verbatim citation overlapping its sentence", async (name) => {
    const fixture = loadFixture(name);
    const redLines = sidecarRedLines(fixture);
    const { analysis } = await analyze(name, redLines);

    const results = redLineCasesFound(fixture, redLines, analysis.redLineMatches);
    expect(results.length).toBe(fixture.sidecar.redLineCases.length);
    for (const { redLineCase, redLine, matches } of results) {
      expect(matches.length, redLineCase.redLine).toBeGreaterThan(0);
      for (const match of matches) {
        expect(fixture.text.includes(match.citation.text)).toBe(true);
        expect(match.redLine).toEqual(redLine);
      }
    }
    expect(analysis.verification).toMatchObject({
      redLineMatchesProposed: fixture.sidecar.redLineCases.length,
      redLineMatchesKept: fixture.sidecar.redLineCases.length,
      redLineMatchesDroppedNoSource: 0,
      redLineMatchesDroppedInvalid: 0,
      redLineMatchesDroppedDuplicate: 0,
      redLineExplanationsReplaced: 0,
    });
  });

  it.each(FIXTURE_NAMES)("%s: cases below the dangerous-clause bar are matched without becoming flags", async (name) => {
    const fixture = loadFixture(name);
    const redLines = sidecarRedLines(fixture);
    const withRedLines = await analyze(name, redLines);
    const without = await analyze(name, []);

    expect(withRedLines.analysis.flags).toHaveLength(without.analysis.flags.length);
    expect(withRedLines.analysis.verification.kept).toBe(without.analysis.verification.kept);

    const below = redLineCasesFound(fixture, redLines, withRedLines.analysis.redLineMatches).filter(
      (r) => !r.redLineCase.clearsDangerousBar,
    );
    expect(below.length).toBeGreaterThan(0);
    for (const { redLineCase, matches } of below) {
      expect(matches.length, redLineCase.redLine).toBeGreaterThan(0);
      const start = fixture.text.indexOf(redLineCase.matchingSentence);
      const end = start + redLineCase.matchingSentence.length;
      const flagged = withRedLines.analysis.flags.filter((f) => f.citation.start < end && f.citation.end > start);
      expect(flagged, redLineCase.redLine).toEqual([]);
    }
  });

  it("the clean agreement still has zero critical and serious flags with red lines matched", async () => {
    const clean = loadFixture("clean-agreement");
    const { analysis } = await analyze("clean-agreement", sidecarRedLines(clean));
    expect(analysis.redLineMatches.length).toBe(clean.sidecar.redLineCases.length);
    expect(analysis.flags.filter((flag) => flag.severity === "critical" || flag.severity === "serious")).toEqual([]);
  });
});

describe("independence from flags", () => {
  it("a case that clears the bar is both a flag at the sidecar's tier and a match, and the tier is the same without red lines", async () => {
    const redLines = sidecarRedLines(adhesion);
    const withRedLines = await analyze("adhesion-contract", redLines);
    const without = await analyze("adhesion-contract", []);

    const cleared = adhesion.sidecar.redLineCases.filter((c) => c.clearsDangerousBar);
    expect(cleared.length).toBeGreaterThan(0);
    for (const redLineCase of cleared) {
      const planted = adhesion.sidecar.plantedClauses.find((c) => c.sentence === redLineCase.matchingSentence);
      expect(planted, redLineCase.redLine).toBeDefined();
      const start = adhesion.text.indexOf(redLineCase.matchingSentence);
      const end = start + redLineCase.matchingSentence.length;
      const flagOn = (analysis: Analysis) =>
        analysis.flags.find((flag) => flag.citation.start < end && flag.citation.end > start);

      expect(flagOn(withRedLines.analysis)?.severity).toBe(planted!.expectedSeverity);
      expect(flagOn(without.analysis)?.severity).toBe(planted!.expectedSeverity);

      const [result] = redLineCasesFound(adhesion, redLines, withRedLines.analysis.redLineMatches).filter(
        (r) => r.redLineCase === redLineCase,
      );
      expect(result.matches).toHaveLength(1);
    }
  });

  it("running with no red lines gives zero matches and exactly the same flags", async () => {
    const withRedLines = await analyze("adhesion-contract", sidecarRedLines(adhesion));
    const without = await analyze("adhesion-contract", []);
    expect(without.analysis.redLineMatches).toEqual([]);
    expect(flagSnapshot(without.analysis)).toEqual(flagSnapshot(withRedLines.analysis));
    expect(without.analysis.verification).toMatchObject({ redLineMatchesProposed: 0, redLineMatchesKept: 0 });
  });

  it("a match carries no severity and isn't in the flags list", async () => {
    const { analysis } = await analyze("adhesion-contract", sidecarRedLines(adhesion));
    for (const match of analysis.redLineMatches) {
      expect(Object.keys(match).sort()).toEqual(["citation", "explanation", "redLine"]);
    }
    expect(analysis.flags.every((flag) => !("redLine" in flag))).toBe(true);
  });

  it("drafts counter-offers for flags only, never for red-line matches", async () => {
    const { analysis, model } = await analyze("adhesion-contract", sidecarRedLines(adhesion));
    const [request] = counterOfferRequests(model);
    const sentQuotes = counterOfferFlagsIn(request).map((flag) => flag.quote);
    expect(sentQuotes).toHaveLength(analysis.flags.length);

    const belowBar = adhesion.sidecar.redLineCases.filter((c) => !c.clearsDangerousBar).map((c) => c.matchingSentence);
    for (const sentence of belowBar) expect(sentQuotes).not.toContain(sentence);
    expect(analysis.verification.counterOffersDrafted).toBe(analysis.flags.length);
  });

  it("makes no counter-offer call when the only findings are red-line matches", async () => {
    const clean = loadFixture("clean-agreement");
    const { analysis, model } = await analyze("clean-agreement", sidecarRedLines(clean));
    expect(analysis.redLineMatches.length).toBeGreaterThan(0);
    expect(counterOfferRequests(model)).toEqual([]);
  });

  it("puts matches in document order, whatever order the red lines came in", async () => {
    const redLines = sidecarRedLines(adhesion).reverse();
    const { analysis } = await analyze("adhesion-contract", redLines);
    const starts = analysis.redLineMatches.map((match) => match.citation.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});

describe("the request", () => {
  it("sends the red lines as data, and an empty list when there are none", async () => {
    const redLines = sidecarRedLines(adhesion);
    const withRedLines = await analyze("adhesion-contract", redLines);
    const without = await analyze("adhesion-contract", []);

    const analysisRequest = (model: StubModel) => model.requests.find((r) => r.name === ANALYSIS_SCHEMA_NAME)!;
    expect(redLinesIn(analysisRequest(withRedLines.model)).map((r) => r.text)).toEqual(redLines.map((r) => r.text));
    expect(redLinesIn(analysisRequest(without.model))).toEqual([]);
    // One analysis call either way: matching doesn't add a call.
    expect(withRedLines.model.requests.filter((r) => r.name === ANALYSIS_SCHEMA_NAME)).toHaveLength(1);
  });

  it("requires redLineMatches in the strict schema", () => {
    expect(ANALYSIS_SCHEMA.required).toContain("redLineMatches");
    expect(ANALYSIS_SCHEMA.properties.redLineMatches.items.required).toEqual(["redLineId", "quote", "explanation"]);
  });

  it("skips blank red lines and repeated ids", async () => {
    const { model } = await analyze("adhesion-contract", [
      { id: "rl-1", text: adhesion.sidecar.redLineCases[0].redLine },
      { id: "rl-1", text: "Something else" },
      { id: "rl-2", text: "   " },
    ]);
    const request = model.requests.find((r) => r.name === ANALYSIS_SCHEMA_NAME)!;
    expect(redLinesIn(request).map((r) => r.text)).toEqual([adhesion.sidecar.redLineCases[0].redLine]);
  });

  it("doesn't read a missing matches list as 'nothing matched' when red lines were sent", async () => {
    await expect(
      analyze("adhesion-contract", sidecarRedLines(adhesion), { output: "no-red-line-matches" }),
    ).rejects.toMatchObject({ name: "AnalysisError", kind: "invalid-output" });

    const { analysis } = await analyze("adhesion-contract", [], { output: "no-red-line-matches" });
    expect(analysis.redLineMatches).toEqual([]);
    expect(analysis.flags.length).toBeGreaterThan(0);
  });
});

describe("faults in the model's matches", () => {
  const redLines = sidecarRedLines(adhesion);

  it("drops a match naming a red line that wasn't sent", async () => {
    const { analysis } = await analyze("adhesion-contract", redLines, { redLineUnknownId: true });
    expect(analysis.redLineMatches).toHaveLength(3);
    expect(analysis.redLineMatches.every((match) => redLines.some((r) => r.id === match.redLine.id))).toBe(true);
    expect(analysis.verification).toMatchObject({
      redLineMatchesProposed: 4,
      redLineMatchesKept: 3,
      redLineMatchesDroppedInvalid: 1,
    });
  });

  it("drops a match whose quote isn't in the document, and counts it", async () => {
    const { analysis } = await analyze("adhesion-contract", redLines, { redLineFabricatedQuote: true });
    expect(analysis.redLineMatches.some((match) => match.citation.text === FABRICATED_QUOTE)).toBe(false);
    expect(analysis.redLineMatches).toHaveLength(3);
    expect(analysis.verification).toMatchObject({
      redLineMatchesProposed: 4,
      redLineMatchesKept: 3,
      redLineMatchesDroppedNoSource: 1,
    });
    // The flag list is untouched by a bad match.
    expect(analysis.verification).toMatchObject({ kept: 8, droppedNoSource: 0 });
  });

  it("replaces an explanation with an invented figure, keeps the match, and counts it", async () => {
    const target = redLines[1];
    const { analysis } = await analyze("adhesion-contract", redLines, { redLineInventedFigure: target.text });
    const match = analysis.redLineMatches.find((m) => m.redLine.id === target.id)!;
    expect(match.explanation).toBe(FALLBACK_RED_LINE_EXPLANATION);
    expect(figuresIn(match.explanation)).toEqual([]);
    expect(analysis.redLineMatches).toHaveLength(3);
    expect(analysis.redLineMatches.filter((m) => m.redLine.id !== target.id).map((m) => m.explanation)).toEqual([
      STUB_MATCH_EXPLANATION,
      STUB_MATCH_EXPLANATION,
    ]);
    expect(analysis.verification).toMatchObject({ redLineMatchesKept: 3, redLineExplanationsReplaced: 1 });
  });

  it("merges a duplicate match on the same red line and span", async () => {
    const target = redLines[0];
    const { analysis } = await analyze("adhesion-contract", redLines, { redLineDuplicate: target.text });
    expect(analysis.redLineMatches.filter((m) => m.redLine.id === target.id)).toHaveLength(1);
    expect(analysis.verification).toMatchObject({
      redLineMatchesProposed: 4,
      redLineMatchesKept: 3,
      redLineMatchesDroppedDuplicate: 1,
    });
  });

  it("keeps two different red lines on the same sentence as two matches", async () => {
    const sentence = adhesion.sidecar.redLineCases[2].redLine;
    const both = [
      { id: "a", text: sentence },
      { id: "b", text: sentence },
    ];
    const { analysis } = await analyze("adhesion-contract", both);
    expect(analysis.redLineMatches.map((m) => m.redLine.id)).toEqual(["a", "b"]);
    expect(analysis.redLineMatches[0].citation.start).toBe(analysis.redLineMatches[1].citation.start);
  });
});

describe("explanation support", () => {
  const sentence = adhesion.sidecar.redLineCases[0].matchingSentence;
  const redLine = adhesion.sidecar.redLineCases[0].redLine;

  it("accepts figures from the quote or from the reader's own red line", () => {
    expect(checkRedLineExplanation("It gives Client 45 days, longer than your 30.", sentence, redLine).supported).toBe(true);
  });

  it("rejects a figure or quoted phrase found in neither", () => {
    expect(checkRedLineExplanation("That is about 60 days.", sentence, redLine)).toEqual({
      supported: false,
      unsupported: ["60"],
    });
    expect(checkRedLineExplanation('It says "net sixty".', sentence, redLine).supported).toBe(false);
  });
});

describe("where matches are shown", () => {
  it("puts a match on the flag it overlaps and lists the rest on their own, leaving both lists alone", async () => {
    const { analysis } = await analyze("adhesion-contract", sidecarRedLines(adhesion));
    const before = JSON.stringify(analysis);
    const groups = groupRedLineMatches(analysis.flags, analysis.redLineMatches);
    expect(JSON.stringify(analysis)).toBe(before);

    const nonCompete = analysis.redLineMatches.findIndex((m) => m.redLine.id === "rl-3");
    const flagIndex = analysis.flags.findIndex((f) => f.clauseType === "non-compete-non-solicit");
    expect(groups.onFlag[flagIndex]).toEqual([nonCompete]);
    expect(groups.onFlag.flat()).toEqual([nonCompete]);
    expect(groups.onTheirOwn.map((m) => analysis.redLineMatches[m].redLine.id).sort()).toEqual(["rl-1", "rl-2"]);
  });
});

describe("data model", () => {
  it("has no way to build a red-line match without a citation, and no severity on one", () => {
    const redLine = { id: "rl-1", text: "Non-competes" };
    // @ts-expect-error A RedLineMatch must carry a Citation.
    const uncited: RedLineMatch = { redLine, explanation: "About non-competes." };
    // @ts-expect-error A Citation only comes from locateCitation, never from a literal.
    const handMade: RedLineMatch = { redLine, citation: { text: "x", start: 0, end: 1 }, explanation: "x" };

    const citation = locateCitation(adhesion.text, adhesion.sidecar.redLineCases[2].matchingSentence) as Citation;
    // @ts-expect-error A RedLineMatch has no severity.
    const withSeverity: RedLineMatch = { redLine, citation, explanation: "x", severity: "critical" };

    type NoSeverity = "severity" extends keyof RedLineMatch ? false : true;
    const noSeverity: NoSeverity = true;
    expect([uncited, handMade, withSeverity, noSeverity]).toHaveLength(4);
  });

  it("throws a typed error for no text, before calling the model", async () => {
    const model = stubModel();
    await expect(analyzeDocument("  ", sidecarRedLines(adhesion), { model })).rejects.toBeInstanceOf(AnalysisError);
    expect(model.requests).toHaveLength(0);
  });
});
