import { expect } from "vitest";
import type { Citation } from "@/lib/analysis/citation";

/**
 * Citation integrity, zero tolerance (ADR 0001, PRD "Every cited sentence is
 * verbatim"): every citation is exactly the span of the document it claims.
 * Later tickets (red-line matches, answers) reuse this for their citations.
 */
export function expectCitationsVerbatim(documentText: string, citations: readonly Citation[]): void {
  for (const citation of citations) {
    expect(citation.text.length, "a citation must quote something").toBeGreaterThan(0);
    expect(documentText.slice(citation.start, citation.end)).toBe(citation.text);
    expect(documentText.includes(citation.text)).toBe(true);
  }
}
