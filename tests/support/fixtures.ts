import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SEVERITY_TIERS = ["critical", "serious", "worth-noting"] as const;
export type ExpectedSeverity = (typeof SEVERITY_TIERS)[number];

/** The seven default clause types from PRD.md "My red lines". */
export const CLAUSE_TYPES = [
  "auto-renewal",
  "unilateral-termination",
  "ip-assignment",
  "uncapped-indemnity",
  "non-compete-non-solicit",
  "arbitration-class-waiver",
  "escalator-or-liability-cap",
] as const;
export type ClauseType = (typeof CLAUSE_TYPES)[number];

/**
 * Which severity axis drove the tier. "neither" is used for worth-noting
 * clauses, which clear the dangerous-clause bar without being especially easy
 * to miss or hard to undo.
 */
export type SeverityAxis = "easy-to-miss" | "hard-to-undo" | "both" | "neither";

export interface PlantedClause {
  id: string;
  type: ClauseType;
  /** Exact sentence from the fixture document; appears there exactly once. */
  sentence: string;
  expectedSeverity: ExpectedSeverity;
  axis: SeverityAxis;
  rationale: string;
  counterOffer: string;
}

export interface RedLineCase {
  redLine: string;
  matchingSentence: string;
  clearsDangerousBar: boolean;
}

export interface SupportedQuestion {
  question: string;
  answer: string;
  supportingSentence: string;
}

export interface UnsupportedQuestion {
  question: string;
}

export interface FixtureSidecar {
  document: string;
  summary: string;
  plantedClauses: PlantedClause[];
  redLineCases: RedLineCase[];
  questions: {
    supported: SupportedQuestion[];
    unsupported: UnsupportedQuestion[];
  };
}

export type FixtureName = "adhesion-contract" | "clean-agreement";

export interface Fixture {
  name: FixtureName;
  text: string;
  sidecar: FixtureSidecar;
}

export const FIXTURE_NAMES: readonly FixtureName[] = [
  "adhesion-contract",
  "clean-agreement",
];

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

export function loadFixture(name: FixtureName): Fixture {
  const sidecar = JSON.parse(
    readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8"),
  ) as FixtureSidecar;
  const text = readFileSync(join(FIXTURES_DIR, sidecar.document), "utf8");
  return { name, text, sidecar };
}

/** Number of non-overlapping occurrences of `needle` in `haystack`. */
export function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  return haystack.split(needle).length - 1;
}
