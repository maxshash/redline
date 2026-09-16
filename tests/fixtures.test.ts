import { describe, expect, it } from "vitest";
import {
  CLAUSE_TYPES,
  FIXTURE_NAMES,
  SEVERITY_TIERS,
  countOccurrences,
  loadFixture,
} from "./support/fixtures";

function citedSentences(name: (typeof FIXTURE_NAMES)[number]) {
  const { sidecar } = loadFixture(name);
  return [
    ...sidecar.plantedClauses.map((c) => ({ field: `plantedClauses[${c.id}].sentence`, value: c.sentence })),
    ...sidecar.redLineCases.map((c, i) => ({ field: `redLineCases[${i}].matchingSentence`, value: c.matchingSentence })),
    ...sidecar.questions.supported.map((q, i) => ({
      field: `questions.supported[${i}].supportingSentence`,
      value: q.supportingSentence,
    })),
  ];
}

describe.each(FIXTURE_NAMES)("fixture %s", (name) => {
  const { text, sidecar } = loadFixture(name);

  it("points at its own document", () => {
    expect(sidecar.document).toBe(`${name}.txt`);
    expect(sidecar.summary.trim().length).toBeGreaterThan(0);
  });

  it.each(citedSentences(name))("$field appears verbatim exactly once", ({ value }) => {
    expect(value.trim().length).toBeGreaterThan(0);
    expect(text.includes(value)).toBe(true);
    expect(countOccurrences(text, value)).toBe(1);
  });

  it("uses only named severity tiers", () => {
    for (const clause of sidecar.plantedClauses) {
      expect(SEVERITY_TIERS).toContain(clause.expectedSeverity);
    }
  });

  it("has red-line cases and both kinds of question", () => {
    expect(sidecar.redLineCases.length).toBeGreaterThanOrEqual(1);
    expect(sidecar.redLineCases.some((c) => !c.clearsDangerousBar)).toBe(true);
    expect(sidecar.questions.supported.length).toBeGreaterThanOrEqual(3);
    expect(sidecar.questions.unsupported.length).toBeGreaterThanOrEqual(2);
  });
});

describe("adhesion contract", () => {
  const { sidecar } = loadFixture("adhesion-contract");

  it("plants every one of the seven clause types", () => {
    const planted = new Set(sidecar.plantedClauses.map((c) => c.type));
    for (const type of CLAUSE_TYPES) {
      expect(planted, `missing clause type ${type}`).toContain(type);
    }
  });

  it("gives each planted clause a unique id and the PRD severity band for its type", () => {
    const band: Record<(typeof CLAUSE_TYPES)[number], string> = {
      "auto-renewal": "critical",
      "unilateral-termination": "critical",
      "ip-assignment": "serious",
      "uncapped-indemnity": "serious",
      "non-compete-non-solicit": "serious",
      "arbitration-class-waiver": "worth-noting",
      "escalator-or-liability-cap": "worth-noting",
    };
    const ids = sidecar.plantedClauses.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const clause of sidecar.plantedClauses) {
      expect(clause.expectedSeverity, clause.id).toBe(band[clause.type]);
      expect(clause.rationale.trim().length, clause.id).toBeGreaterThan(0);
      expect(clause.counterOffer.trim().length, clause.id).toBeGreaterThan(0);
    }
  });

  it("has a red-line case below the dangerous-clause bar and one on a planted clause", () => {
    const plantedSentences = new Set(sidecar.plantedClauses.map((c) => c.sentence));
    const below = sidecar.redLineCases.filter((c) => !c.clearsDangerousBar);
    const above = sidecar.redLineCases.filter((c) => c.clearsDangerousBar);
    expect(below.length).toBeGreaterThanOrEqual(1);
    expect(above.length).toBeGreaterThanOrEqual(1);
    for (const c of below) expect(plantedSentences.has(c.matchingSentence)).toBe(false);
    for (const c of above) expect(plantedSentences.has(c.matchingSentence)).toBe(true);
  });
});

describe("clean agreement", () => {
  it("has zero planted clauses", () => {
    expect(loadFixture("clean-agreement").sidecar.plantedClauses).toEqual([]);
  });
});
