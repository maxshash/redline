import { expect } from "vitest";
import type { Citation } from "@/lib/analysis/citation";
import type { Flag, RedLineMatch } from "@/lib/analysis/types";

/**
 * Citation integrity, zero tolerance (ADR 0001, PRD "Every cited sentence is
 * verbatim"): every citation is exactly the span of the document it claims.
 *
 * Pass a list of citations, or an analysis: then every flag's and every
 * red-line match's citation is checked.
 */
export function expectCitationsVerbatim(
  documentText: string,
  citations: readonly Citation[] | { flags: readonly Flag[]; redLineMatches: readonly RedLineMatch[] },
): void {
  const all =
    "flags" in citations
      ? [...citations.flags.map((flag) => flag.citation), ...citations.redLineMatches.map((match) => match.citation)]
      : citations;
  for (const citation of all) {
    expect(citation.text.length, "a citation must quote something").toBeGreaterThan(0);
    expect(documentText.slice(citation.start, citation.end)).toBe(citation.text);
    expect(documentText.includes(citation.text)).toBe(true);
  }
}
