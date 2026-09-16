import type { SeverityAxis, SeverityTier } from "./types";

/**
 * The flag voice rule (ADR 0005): the quote is the fact, and the rationale is
 * judgment that may not assert specifics the quote doesn't contain.
 *
 * This is the mechanical part of that rule. A rationale is unsupported when
 * it mentions a figure (digits, number words, durations, percentages, money)
 * whose value doesn't appear in the quote, or puts a phrase in quotation
 * marks that the quote doesn't contain. Figures are compared by value, so
 * "24 months" is supported by "twenty-four (24) months". A figure worked out
 * from the quote (45 days minus 30 days is "a fifteen-day window") is not in
 * the quote, so it counts as unsupported.
 */

const SMALL: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALES: Record<string, number> = {
  hundred: 100,
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

/**
 * "one" is everywhere in ordinary prose ("one-sided", "no one", "one party"),
 * so on its own it only counts as a figure when a unit follows it.
 */
const UNIT_AFTER_ONE =
  /^(?:business|calendar|full)?[\s-]*(?:days?|weeks?|months?|years?|hours?|minutes?|percent(?:age)?|dollars?|times?|terms?)\b/i;

const TOKEN = /\d[\d,]*(?:\.\d+)?|[a-z]+/gi;

interface Token {
  value: string;
  start: number;
  end: number;
}

function tokens(text: string): Token[] {
  const found: Token[] = [];
  for (const match of text.matchAll(TOKEN)) {
    found.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  }
  return found;
}

function isNumberWord(word: string): boolean {
  const lower = word.toLowerCase();
  return lower in SMALL || lower in SCALES;
}

/** Every numeric value written in `text`, in digits or in words. */
export function figuresIn(text: string): number[] {
  const values: number[] = [];
  const list = tokens(text);

  for (let i = 0; i < list.length; i++) {
    const token = list[i];
    if (/^\d/.test(token.value)) {
      const value = Number(token.value.replace(/,/g, "").replace(/\.$/, ""));
      if (Number.isFinite(value)) values.push(value);
      continue;
    }
    if (!isNumberWord(token.value)) continue;

    // Gather a run of number words joined only by spaces, hyphens or "and".
    const run: Token[] = [token];
    let j = i + 1;
    while (j < list.length) {
      const gap = text.slice(list[j - 1].end, list[j].start);
      if (!/^[\s-]*$/.test(gap)) break;
      if (list[j].value.toLowerCase() === "and" && j + 1 < list.length && isNumberWord(list[j + 1].value)) {
        j++;
        continue;
      }
      if (!isNumberWord(list[j].value)) break;
      run.push(list[j]);
      j++;
    }
    i = j - 1;

    const words = run.map((t) => t.value.toLowerCase());
    if (words.length === 1 && words[0] === "one") {
      const after = text.slice(token.end);
      if (!UNIT_AFTER_ONE.test(after)) continue;
    }
    values.push(wordsToNumber(words));
  }
  return values;
}

function wordsToNumber(words: string[]): number {
  let total = 0;
  let current = 0;
  for (const word of words) {
    if (word in SMALL) {
      current += SMALL[word];
    } else if (word === "hundred") {
      current = (current || 1) * 100;
    } else {
      total += (current || 1) * SCALES[word];
      current = 0;
    }
  }
  return total + current;
}

/** Phrases a rationale puts in double quotation marks (straight or curly). */
export function quotedPhrasesIn(text: string): string[] {
  const phrases: string[] = [];
  for (const match of text.matchAll(/["“]([^"“”]+)["”]|‘([^‘’]+)’/g)) {
    const phrase = (match[1] ?? match[2]).trim();
    if (phrase.length > 0) phrases.push(phrase);
  }
  return phrases;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export interface RationaleCheck {
  supported: boolean;
  /** The figures and quoted phrases the quote doesn't contain. */
  unsupported: string[];
}

export function checkRationale(rationale: string, quote: string): RationaleCheck {
  return checkSupport(rationale, [quote]);
}

/**
 * The same check for a red-line match's explanation. Its figures and quoted
 * phrases may come from the cited clause or from the reader's own red line
 * ("later than 30 days" is the reader's figure, not an invented one), and
 * from nowhere else.
 */
export function checkRedLineExplanation(explanation: string, quote: string, redLineText: string): RationaleCheck {
  return checkSupport(explanation, [quote, redLineText]);
}

function checkSupport(claim: string, sources: readonly string[]): RationaleCheck {
  const available = new Set(sources.flatMap(figuresIn));
  const unsupported: string[] = [];

  for (const value of figuresIn(claim)) {
    if (!available.has(value)) unsupported.push(String(value));
  }
  const haystacks = sources.map(collapseWhitespace);
  for (const phrase of quotedPhrasesIn(claim)) {
    const wanted = collapseWhitespace(phrase);
    if (!haystacks.some((haystack) => haystack.includes(wanted))) unsupported.push(`"${phrase}"`);
  }
  return { supported: unsupported.length === 0, unsupported };
}

/**
 * The explanation used when the model's own one asserted something the quote
 * and the red line don't support. It says only that the sentence matches.
 */
export const FALLBACK_RED_LINE_EXPLANATION = "This sentence matches your red line.";

/**
 * The rationale used when the model's own one asserted something the quote
 * doesn't support. It says only which axis placed the clause in its tier,
 * hedged the way that tier's judgment is hedged, and nothing about the
 * clause's content.
 */
export function fallbackRationale(severity: SeverityTier, axis: SeverityAxis): string {
  const reading = AXIS_READING[axis];
  switch (severity) {
    case "critical":
      return axis === "neither"
        ? "Marked critical. It's worth raising before you sign."
        : `Marked critical because it looks ${reading}. It's worth raising before you sign.`;
    case "serious":
      return axis === "neither"
        ? "Marked serious. It's probably worth raising before you sign."
        : `Marked serious because it looks ${reading}. It's probably worth raising before you sign.`;
    case "worth-noting":
      return axis === "neither"
        ? "It doesn't look especially easy to miss or hard to undo, so it's only marked worth noting. Read it before you sign."
        : `It looks ${reading}, but it's only marked worth noting. Read it before you sign.`;
  }
}

const AXIS_READING: Record<SeverityAxis, string> = {
  both: "easy to miss and hard to undo",
  "easy-to-miss": "easy to miss",
  "hard-to-undo": "hard to undo once it applies",
  neither: "neither especially easy to miss nor hard to undo",
};
