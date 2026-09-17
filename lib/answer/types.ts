import type { Citation } from "@/lib/citations/citation";

export type { Citation } from "@/lib/citations/citation";

/** At least one of `T`. An answer that claims support can't be built from an empty list. */
export type NonEmpty<T> = readonly [T, ...T[]];

/** Why an answer the model marked "answered" was turned into "not-in-document". */
export type DowngradeReason =
  /** None of its quotes were found in the document, or it gave none. */
  | "no-verified-quote"
  /** Its answer names a figure or quotes a phrase that none of its citations contain. */
  | "unsupported-detail";

/** What happened to the model's output on the way to the answer. */
export interface AnswerVerification {
  /** Quotes the model proposed. */
  quotesProposed: number;
  /** Quotes that were found in the document and are in `citations` or `related`. */
  quotesKept: number;
  /** Quotes that aren't in the document, or weren't text at all. */
  quotesDropped: number;
  /** Quotes that cite a span another kept quote already cites. */
  quotesDuplicate: number;
  /** True when the model said "answered" and the answer didn't hold up. */
  downgraded: boolean;
  downgradeReason: DowngradeReason | null;
}

/**
 * An answer to a question about one document, from that document alone.
 *
 * "answered" always carries at least one verified `Citation`, and every
 * figure and quoted phrase in `answer` appears in those citations.
 *
 * "not-in-document" is an honest finding, not an error. Its `message` is
 * Redline's own wording and never the model's claim. `related` holds any
 * verified sentences that come closest; it may be empty.
 */
export type Answer =
  | {
      kind: "answered";
      answer: string;
      citations: NonEmpty<Citation>;
      verification: AnswerVerification;
    }
  | {
      kind: "not-in-document";
      message: string;
      related: Citation[];
      verification: AnswerVerification;
    };
