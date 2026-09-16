/**
 * A citation is a span of the document text, and the only way to get one is
 * `locateCitation`, which checks it against the text. Every flag holds a
 * Citation, so a flag that points at nothing can't be built (ADR 0001).
 */

declare const citationBrand: unique symbol;

export type Citation = {
  /** Exactly `documentText.slice(start, end)`. */
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly [citationBrand]: true;
};

/**
 * Find `quote` in `documentText` and return the span it covers, or null.
 *
 * An exact match is tried first. Failing that, the only difference tolerated
 * is whitespace: the quote may have a space where the document has a line
 * break, a single space where the document has two, or stray whitespace at
 * its ends. In that case the stored citation is the document's own span, so
 * `citation.text` is always an exact substring of the document.
 *
 * Nothing else is tolerated: no case folding, no quote-mark or dash
 * substitution, no fuzzy matching. A quote that differs in any visible
 * character is not in the document.
 *
 * If the quote occurs more than once, the first occurrence is cited.
 */
export function locateCitation(documentText: string, quote: string): Citation | null {
  const wanted = quote.trim();
  if (wanted.length === 0) return null;

  const exact = documentText.indexOf(wanted);
  if (exact !== -1) return citationAt(documentText, exact, exact + wanted.length);

  const words = wanted.split(/\s+/);
  if (words.length < 2) return null;
  const pattern = new RegExp(words.map(escapeRegExp).join("\\s+"));
  const match = pattern.exec(documentText);
  if (!match) return null;
  return citationAt(documentText, match.index, match.index + match[0].length);
}

function citationAt(documentText: string, start: number, end: number): Citation {
  const text = documentText.slice(start, end);
  return { text, start, end } as Citation;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
