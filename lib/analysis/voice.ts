import { checkSupport, type SupportCheck } from "@/lib/citations/support";
import type { SeverityAxis, SeverityTier } from "./types";

/**
 * The flag voice rule (ADR 0005): the quote is the fact, and the rationale is
 * judgment that may not assert specifics the quote doesn't contain. The
 * mechanical check itself lives in `lib/citations/support.ts`.
 */

export type RationaleCheck = SupportCheck;

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
