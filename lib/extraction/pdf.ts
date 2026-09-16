/**
 * Turning pdf.js text items back into running text.
 *
 * A PDF has no words, lines or paragraphs, only glyph runs placed on a page.
 * pdf.js returns those runs as items with a position and a width. This module
 * rebuilds lines from the items, then joins lines into paragraphs, so that a
 * sentence wrapped across several lines comes back as one unbroken sentence.
 */

/** The fields of a pdf.js `TextItem` this module reads. */
export interface PdfTextItem {
  str: string;
  /** pdf.js transform matrix; [4] is x and [5] is the baseline y. */
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
}

interface Line {
  text: string;
  y: number;
  height: number;
}

const WHITESPACE_AT_END = /\s$/;
const WHITESPACE_AT_START = /^\s/;

/** Group a page's items into visual lines, inserting spaces where there is a gap. */
export function itemsToLines(items: PdfTextItem[]): Line[] {
  const lines: Line[] = [];
  let current: Line | null = null;
  let previous: PdfTextItem | null = null;

  for (const item of items) {
    const x = item.transform[4];
    const y = item.transform[5];
    const size = Math.max(item.height, previous?.height ?? 0, 1);

    const sameLine =
      current !== null &&
      previous !== null &&
      !previous.hasEOL &&
      Math.abs(y - current.y) <= size * 0.5;

    if (!sameLine) {
      if (current && current.text.trim().length > 0) lines.push(current);
      current = { text: item.str, y, height: item.height };
    } else if (current && previous) {
      const gap = x - (previous.transform[4] + previous.width);
      // pdf.js usually includes the space glyphs itself. When a PDF positions
      // each word separately with no space glyph, the gap is the only sign of
      // a word break. A tenth of the font size is well under any real space.
      const needsSpace =
        item.str.length > 0 &&
        gap > size * 0.1 &&
        !WHITESPACE_AT_END.test(current.text) &&
        !WHITESPACE_AT_START.test(item.str);
      current.text += (needsSpace ? " " : "") + item.str;
      current.height = Math.max(current.height, item.height);
    }
    previous = item;
  }
  if (current && current.text.trim().length > 0) lines.push(current);

  return lines.map((line) => ({ ...line, text: line.text.replace(/\s+/g, " ").trim() }));
}

/** The most common distance between consecutive baselines, i.e. the line pitch. */
function typicalLinePitch(pages: Line[][]): number | null {
  const counts = new Map<number, number>();
  for (const lines of pages) {
    for (let i = 1; i < lines.length; i++) {
      const pitch = Math.round((lines[i - 1].y - lines[i].y) * 2) / 2;
      if (pitch > 0) counts.set(pitch, (counts.get(pitch) ?? 0) + 1);
    }
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [pitch, count] of counts) {
    // Ties go to the smaller pitch: body text is tighter than paragraph gaps.
    if (count > bestCount || (count === bestCount && best !== null && pitch < best)) {
      best = pitch;
      bestCount = count;
    }
  }
  return best;
}

const ENDS_SENTENCE = /[.!?:;]["'\u2019\u201D)\]]*$/;
const ENDS_WITH_WORD_HYPHEN = /\p{L}-$/u;
const STARTS_WITH_LETTER = /^\p{L}/u;

/** How to join the end of one line to the start of the next inside a paragraph. */
function softJoin(before: string, after: string): string {
  // A compound like "then-current" wraps after its hyphen. Joining with no
  // space restores it exactly; a space would break any citation across it.
  if (ENDS_WITH_WORD_HYPHEN.test(before) && STARTS_WITH_LETTER.test(after)) return "";
  return " ";
}

/**
 * Join every page's items into one text.
 *
 * - Items on one line are joined, with a space where the geometry shows a gap.
 * - Consecutive lines at the document's usual line pitch are one paragraph and
 *   are joined with a space, so wrapped sentences stay whole.
 * - A larger gap, or a jump back up the page (a new column), starts a new
 *   paragraph: a blank line.
 * - Across a page break, a line that ends a sentence starts a new paragraph;
 *   otherwise the sentence carries on onto the next page.
 */
export function joinPdfPages(pages: PdfTextItem[][]): string {
  const pageLines = pages.map(itemsToLines);
  const pitch = typicalLinePitch(pageLines);

  let out = "";
  let last: Line | null = null;

  for (let p = 0; p < pageLines.length; p++) {
    const lines = pageLines[p];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!last) {
        out = line.text;
      } else if (i === 0) {
        out += ENDS_SENTENCE.test(last.text) ? "\n\n" : softJoin(last.text, line.text);
        out += line.text;
      } else {
        const drop = last.y - line.y;
        const threshold = (pitch ?? Math.max(last.height, line.height) * 1.2) * 1.3;
        out += drop > 0 && drop <= threshold ? softJoin(last.text, line.text) : "\n\n";
        out += line.text;
      }
      last = line;
    }
  }
  return out;
}
