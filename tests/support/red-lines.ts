import type { RedLineMatch, RedLineRef } from "@/lib/analysis/types";
import type { Fixture, RedLineCase } from "./fixtures";

/** A fixture's red-line cases as the red lines a user would have: ids rl-1, rl-2, ... */
export function sidecarRedLines(fixture: Fixture): RedLineRef[] {
  return fixture.sidecar.redLineCases.map((c, i) => ({ id: `rl-${i + 1}`, text: c.redLine }));
}

export interface RedLineCaseResult {
  redLineCase: RedLineCase;
  redLine: RedLineRef;
  /** Matches for this case's red line whose citation overlaps its matching sentence. */
  matches: RedLineMatch[];
}

/**
 * Which red-line cases an analysis found. A match counts when it names the
 * case's red line and its citation overlaps the matching sentence.
 */
export function redLineCasesFound(
  fixture: Fixture,
  redLines: readonly RedLineRef[],
  matches: readonly RedLineMatch[],
): RedLineCaseResult[] {
  return fixture.sidecar.redLineCases.map((redLineCase) => {
    const redLine = redLines.find((r) => r.text === redLineCase.redLine);
    if (!redLine) throw new Error(`no red line for case "${redLineCase.redLine}"`);
    const start = fixture.text.indexOf(redLineCase.matchingSentence);
    const end = start + redLineCase.matchingSentence.length;
    return {
      redLineCase,
      redLine,
      matches: matches.filter(
        (match) => match.redLine.id === redLine.id && match.citation.start < end && match.citation.end > start,
      ),
    };
  });
}
