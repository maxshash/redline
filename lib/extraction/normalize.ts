/**
 * Whitespace normalisation applied to every extracted document, whatever its
 * format. Citations later have to be exact substrings of this text, so this
 * only ever touches whitespace and invisible characters. It never changes a
 * visible character: no quote straightening, no dash folding, no case changes.
 *
 * The rules, in order:
 * 1. Drop invisible characters that carry no text: byte order marks (U+FEFF),
 *    soft hyphens (U+00AD), zero-width spaces (U+200B), and C0 control
 *    characters other than tab, line feed, carriage return and form feed.
 * 2. Line breaks: CRLF, CR, form feed, vertical tab, U+2028 and U+2029 become LF.
 * 3. Tabs, no-break spaces and the other Unicode space separators become a
 *    plain space, and any run of spaces becomes one space.
 * 4. Spaces at the start and end of each line are removed.
 * 5. Three or more line breaks in a row become two (one blank line).
 * 6. Leading and trailing blank space around the whole text is removed.
 *
 * Single line breaks inside a paragraph are kept as they are.
 */
export function normalizeExtractedText(raw: string): string {
  return (
    raw
      // 1. Invisible characters.
      // eslint-disable-next-line no-control-regex
      .replace(/[\uFEFF\u00AD\u200B\u0000-\u0008\u000E-\u001F\u007F]/g, "")
      // 2. Line breaks.
      .replace(/\r\n?|[\f\v\u2028\u2029]/g, "\n")
      // 3. Horizontal whitespace.
      .replace(/[\t \u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, " ")
      // 4. Line edges.
      .replace(/ *\n */g, "\n")
      // 5. Blank lines.
      .replace(/\n{3,}/g, "\n\n")
      // 6. Whole text.
      .trim()
  );
}

/** Letters and digits: what counts as "real text" when judging a PDF. */
export function countTextCharacters(value: string): number {
  return value.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
}
