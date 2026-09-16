import type { Flag } from "@/lib/analysis/types";
import type { Fixture, PlantedClause } from "./fixtures";

export interface PlantedResult {
  clause: PlantedClause;
  /** The flags whose citation overlaps the planted sentence. */
  flags: Flag[];
}

/**
 * Which planted clauses an analysis found. A flag counts when its citation
 * overlaps the planted sentence, so quoting part of the sentence, or the
 * sentence with its neighbour, still counts as finding it.
 */
export function plantedClausesFound(fixture: Fixture, flags: readonly Flag[]): PlantedResult[] {
  return fixture.sidecar.plantedClauses.map((clause) => {
    const start = fixture.text.indexOf(clause.sentence);
    const end = start + clause.sentence.length;
    return {
      clause,
      flags: flags.filter((flag) => flag.citation.start < end && flag.citation.end > start),
    };
  });
}
