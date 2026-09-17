import { describe, expect, it } from "vitest";
import { AnalysisError, analyzeDocument } from "@/lib/analysis/analyze";
import { locateCitation, type Citation } from "@/lib/citations/citation";
import type { Analysis, Flag } from "@/lib/analysis/types";
import { SEVERITY_TIERS } from "@/lib/analysis/types";
import { ANALYSIS_SCHEMA_NAME } from "@/lib/analysis/prompt";
import { checkRationale } from "@/lib/analysis/voice";
import { figuresIn } from "@/lib/citations/support";
import { expectCitationsVerbatim } from "../support/citations";
import { loadFixture, type FixtureName } from "../support/fixtures";
import { stubModel, type StubFaults } from "../support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const clean = loadFixture("clean-agreement");
const planted = (id: string) => {
  const clause = adhesion.sidecar.plantedClauses.find((c) => c.id === id);
  if (!clause) throw new Error(`no planted clause ${id}`);
  return clause;
};

/** Run the real analysis against a fixture, and check citation integrity on every result. */
async function analyze(name: FixtureName, faults: StubFaults = {}): Promise<Analysis> {
  const fixture = loadFixture(name);
  const analysis = await analyzeDocument(fixture.text, [], { model: stubModel(faults) });
  expectCitationsVerbatim(fixture.text, analysis);
  return analysis;
}

/** The kept flag whose citation covers this planted sentence, if any. */
function flagFor(analysis: Analysis, sentence: string): Flag | undefined {
  const start = adhesion.text.indexOf(sentence);
  const end = start + sentence.length;
  return analysis.flags.find((flag) => flag.citation.start <= start && flag.citation.end >= end);
}

describe("citation integrity", () => {
  it("cites exact spans of the document on both fixtures", async () => {
    const flagged = await analyze("adhesion-contract");
    const standard = await analyze("clean-agreement");
    expect(flagged.flags.length).toBeGreaterThan(0);
    expect(standard.verification.droppedNoSource).toBe(0);
  });

  it("drops a flag whose quote isn't in the document, and counts it", async () => {
    const analysis = await analyze("adhesion-contract", { fabricatedQuote: true });
    expect(analysis.flags.some((flag) => flag.clauseType === "early-exit-fee")).toBe(false);
    expect(analysis.verification).toMatchObject({ proposed: 9, kept: 8, droppedNoSource: 1 });
  });

  it("keeps a quote that differs only in whitespace, and stores the document's own span", async () => {
    const clause = planted("unilateral-termination");
    const analysis = await analyze("adhesion-contract", { lineBreakAsSpace: clause.id });

    const flag = flagFor(analysis, clause.sentence);
    expect(flag).toBeDefined();
    expect(flag!.citation.text).toContain("\n\n");
    expect(flag!.citation.text.endsWith(clause.sentence)).toBe(true);
    expect(analysis.verification).toMatchObject({ kept: 8, droppedNoSource: 0 });
  });

  it("drops a quote whose quote marks were changed", async () => {
    const clause = planted("uncapped-indemnity");
    const analysis = await analyze("adhesion-contract", { curlyQuoteMarks: clause.id });
    expect(flagFor(analysis, clause.sentence)).toBeUndefined();
    expect(analysis.verification).toMatchObject({ kept: 7, droppedNoSource: 1 });
  });
});

describe("locateCitation", () => {
  const text = adhesion.text;
  const sentence = planted("auto-renewal").sentence;

  it("finds an exact quote", () => {
    const citation = locateCitation(text, sentence);
    expect(citation).not.toBeNull();
    expect(citation!.text).toBe(sentence);
    expect(text.slice(citation!.start, citation!.end)).toBe(sentence);
  });

  it("allows extra whitespace at the ends and doubled spaces inside", () => {
    const citation = locateCitation(text, `  ${sentence.replace("automatically renew", "automatically  renew")}\n`);
    expect(citation?.text).toBe(sentence);
  });

  it("allows a space where the document breaks the line", () => {
    const heading = "3. TERM AND RENEWAL\n\n3.1 This Agreement begins";
    expect(text).toContain(heading);
    const citation = locateCitation(text, heading.replace(/\n+/g, " "));
    expect(citation?.text).toBe(heading);
  });

  it("rejects anything but a whitespace difference", () => {
    expect(locateCitation(text, sentence.toLowerCase())).toBeNull();
    expect(locateCitation(text, sentence.replace("forty-five", "forty–five"))).toBeNull();
    expect(locateCitation(text, sentence.replace("renewal terms", "renewal term"))).toBeNull();
    expect(locateCitation(text, sentence.replace("renew for", "renewfor"))).toBeNull();
    expect(locateCitation(text, "")).toBeNull();
    expect(locateCitation(text, "   ")).toBeNull();
  });
});

describe("recall", () => {
  it("flags every planted clause the model returns, at the sidecar's tier", async () => {
    const analysis = await analyze("adhesion-contract");
    for (const clause of adhesion.sidecar.plantedClauses) {
      const flag = flagFor(analysis, clause.sentence);
      expect(flag, clause.id).toBeDefined();
      expect(flag!.severity, clause.id).toBe(clause.expectedSeverity);
      expect(flag!.axis, clause.id).toBe(clause.axis);
      expect(flag!.clauseType, clause.id).toBe(clause.type);
    }
    expect(analysis.verification).toMatchObject({
      proposed: 8,
      kept: 8,
      droppedNoSource: 0,
      droppedInvalid: 0,
      droppedDuplicate: 0,
    });
  });
});

describe("clean document", () => {
  it("is a normal analysis with a summary and no critical or serious flags", async () => {
    const analysis = await analyze("clean-agreement");
    expect(analysis.summary).toBe(clean.sidecar.summary);
    expect(analysis.flags.filter((flag) => flag.severity !== "worth-noting")).toEqual([]);
    expect(analysis.verification).toEqual({
      proposed: 0,
      kept: 0,
      droppedNoSource: 0,
      droppedInvalid: 0,
      droppedDuplicate: 0,
      rationalesReplaced: 0,
      counterOffersDrafted: 0,
      counterOffersUnavailable: 0,
      redLineMatchesProposed: 0,
      redLineMatchesKept: 0,
      redLineMatchesDroppedNoSource: 0,
      redLineMatchesDroppedInvalid: 0,
      redLineMatchesDroppedDuplicate: 0,
      redLineExplanationsReplaced: 0,
    });
    expect(analysis.redLineMatches).toEqual([]);
  });
});

describe("flag voice", () => {
  it("replaces a rationale that invents a figure, keeps the flag, and counts it", async () => {
    const clause = planted("uncapped-indemnity");
    const analysis = await analyze("adhesion-contract", { inventedFigure: clause.id });
    const flag = flagFor(analysis, clause.sentence)!;

    expect(flag.severity).toBe("serious");
    expect(flag.rationale).not.toContain("90");
    expect(flag.rationale).not.toBe(clause.rationale);
    expect(checkRationale(flag.rationale, flag.citation.text).supported).toBe(true);
    expect(figuresIn(flag.rationale)).toEqual([]);
    expect(analysis.verification.kept).toBe(8);
  });

  it("keeps a supported rationale word for word, including figures the quote contains", async () => {
    const analysis = await analyze("adhesion-contract");
    // "24 months" against "twenty-four (24) months"; "$2,000" against "two thousand dollars ($2,000)".
    for (const id of ["non-compete-non-solicit", "liability-cap", "unilateral-termination", "broad-ip-assignment"]) {
      const clause = planted(id);
      expect(flagFor(analysis, clause.sentence)!.rationale, id).toBe(clause.rationale);
    }
  });

  it("treats a figure worked out from the quote as unsupported", async () => {
    // The sidecar's auto-renewal rationale speaks of "a fifteen-day window",
    // which is 45 minus 30. Fifteen isn't in the sentence.
    const clause = planted("auto-renewal");
    const analysis = await analyze("adhesion-contract");
    const flag = flagFor(analysis, clause.sentence)!;
    expect(flag.severity).toBe("critical");
    expect(flag.rationale).not.toBe(clause.rationale);
    expect(checkRationale(flag.rationale, flag.citation.text).supported).toBe(true);
    expect(analysis.verification.rationalesReplaced).toBe(1);
  });

  it("reads figures in digits and words, and ignores 'one' in ordinary prose", () => {
    expect(figuresIn("for twenty-four (24) months")).toEqual([24, 24]);
    expect(figuresIn("two thousand dollars ($2,000)")).toEqual([2000, 2000]);
    expect(figuresIn("a fee of 4% rising by two percentage points")).toEqual([4, 2]);
    expect(figuresIn("It is one-sided, and no one checks it.")).toEqual([]);
    expect(figuresIn("within one year")).toEqual([1]);
  });

  it("requires a phrase in quotation marks to appear in the quote", () => {
    const quote = planted("liability-cap").sentence;
    expect(checkRationale('It uses "In no event" to cap only Client.', quote).supported).toBe(true);
    expect(checkRationale('It says "under any theory" to cap only Client.', quote)).toEqual({
      supported: false,
      unsupported: ['"under any theory"'],
    });
  });
});

describe("validation of model output", () => {
  it("drops only the flag with an unknown tier", async () => {
    const clause = planted("broad-ip-assignment");
    const analysis = await analyze("adhesion-contract", { badSeverity: clause.id });
    expect(flagFor(analysis, clause.sentence)).toBeUndefined();
    expect(analysis.verification).toMatchObject({ proposed: 8, kept: 7, droppedInvalid: 1 });
  });

  it.each(["quote", "clauseType", "severity", "axis", "rationale"] as const)(
    "drops only the flag missing its %s",
    async (field) => {
      const clause = planted("non-compete-non-solicit");
      const analysis = await analyze("adhesion-contract", { missingField: { id: clause.id, field } });
      expect(flagFor(analysis, clause.sentence)).toBeUndefined();
      expect(analysis.verification).toMatchObject({ kept: 7, droppedInvalid: 1 });
    },
  );

  it("merges flags citing the same span, keeping the heavier tier", async () => {
    const clause = planted("liability-cap");
    const same = await analyze("adhesion-contract", { duplicate: { id: clause.id } });
    expect(same.flags.filter((flag) => flag.citation.text === clause.sentence)).toHaveLength(1);
    expect(same.verification).toMatchObject({ proposed: 9, kept: 8, droppedDuplicate: 1 });

    const heavier = await analyze("adhesion-contract", { duplicate: { id: clause.id, severity: "serious" } });
    expect(flagFor(heavier, clause.sentence)!.severity).toBe("serious");
  });

  it("throws a typed error when the output isn't JSON", async () => {
    await expect(analyze("adhesion-contract", { output: "not-json" })).rejects.toMatchObject({
      name: "AnalysisError",
      kind: "invalid-output",
    });
  });

  it("throws a typed error when the model call throws", async () => {
    const error = await analyze("adhesion-contract", { throws: true }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AnalysisError);
    expect((error as AnalysisError).kind).toBe("model-failed");
  });

  it("requires a summary", async () => {
    await expect(analyze("adhesion-contract", { output: "no-summary" })).rejects.toMatchObject({
      kind: "invalid-output",
    });
  });

  it("doesn't read a missing flags list as a clean document", async () => {
    await expect(analyze("clean-agreement", { output: "no-flags" })).rejects.toMatchObject({
      kind: "invalid-output",
    });
  });

  it("sends the document text to the model unchanged", async () => {
    const model = stubModel();
    await analyzeDocument(adhesion.text, [], { model });
    expect(model.lastFixture?.name).toBe("adhesion-contract");
    expect(model.requests.filter((request) => request.name === ANALYSIS_SCHEMA_NAME)).toHaveLength(1);
  });
});

describe("ordering", () => {
  it("orders by tier, then by position in the document", async () => {
    const analysis = await analyze("adhesion-contract");
    const ranks = analysis.flags.map((flag) => SEVERITY_TIERS.indexOf(flag.severity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    for (let i = 1; i < analysis.flags.length; i++) {
      const [before, after] = [analysis.flags[i - 1], analysis.flags[i]];
      if (before.severity === after.severity) expect(before.citation.start).toBeLessThan(after.citation.start);
    }
    // The sidecar lists the fee escalator after the arbitration clause; the document doesn't.
    expect(analysis.flags.map((flag) => flag.clauseType).slice(-3)).toEqual([
      "escalator-or-liability-cap",
      "escalator-or-liability-cap",
      "arbitration-class-waiver",
    ]);
  });
});

describe("data model", () => {
  it("has no way to build a flag without a citation", () => {
    // @ts-expect-error A Flag must carry a Citation.
    const uncited: Flag = { clauseType: "auto-renewal", severity: "critical", axis: "both", rationale: "Easy to miss." };
    // @ts-expect-error A Citation only comes from locateCitation, never from a literal.
    const handMade: Citation = { text: "renew", start: 0, end: 5 };
    expect([uncited, handMade]).toHaveLength(2);
  });
});
