import type { SeverityAxis, SeverityTier } from "./types";

/** How tiers, axes and clause types read on screen. */

export const TIER_LABEL: Record<SeverityTier, string> = {
  critical: "Critical",
  serious: "Serious",
  "worth-noting": "Worth noting",
};

export const AXIS_LABEL: Record<SeverityAxis, string> = {
  both: "Easy to miss and hard to undo",
  "easy-to-miss": "Easy to miss",
  "hard-to-undo": "Hard to undo",
  neither: "Not especially easy to miss or hard to undo",
};

const CLAUSE_LABEL: Record<string, string> = {
  "auto-renewal": "Automatic renewal",
  "unilateral-termination": "One-sided termination",
  "ip-assignment": "IP assignment",
  "uncapped-indemnity": "Uncapped indemnity",
  "non-compete-non-solicit": "Non-compete or non-solicit",
  "arbitration-class-waiver": "Arbitration or class action waiver",
  "escalator-or-liability-cap": "Fee increase or liability cap",
};

/** A library clause's name, or a clause type the model named itself, made readable. */
export function clauseLabel(clauseType: string): string {
  const known = CLAUSE_LABEL[clauseType];
  if (known) return known;
  const words = clauseType.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return words.length > 0 ? words.charAt(0).toUpperCase() + words.slice(1) : "Other clause";
}
