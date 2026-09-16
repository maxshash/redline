import type { Citation } from "./citation";

export type { Citation } from "./citation";

/** Named tiers, heaviest first. There is no numeric score (ADR 0003). */
export const SEVERITY_TIERS = ["critical", "serious", "worth-noting"] as const;
export type SeverityTier = (typeof SEVERITY_TIERS)[number];

/**
 * Which axis placed the clause in its tier. Worth-noting clauses use
 * "neither": they clear the dangerous-clause bar without being especially
 * easy to miss or hard to undo.
 */
export const SEVERITY_AXES = ["easy-to-miss", "hard-to-undo", "both", "neither"] as const;
export type SeverityAxis = (typeof SEVERITY_AXES)[number];

/** The default clause library (PRD.md, "My red lines"), with typical tiers. */
export const DEFAULT_CLAUSE_LIBRARY = [
  { clauseType: "auto-renewal", tier: "critical" },
  { clauseType: "unilateral-termination", tier: "critical" },
  { clauseType: "ip-assignment", tier: "serious" },
  { clauseType: "uncapped-indemnity", tier: "serious" },
  { clauseType: "non-compete-non-solicit", tier: "serious" },
  { clauseType: "arbitration-class-waiver", tier: "worth-noting" },
  { clauseType: "escalator-or-liability-cap", tier: "worth-noting" },
] as const satisfies readonly { clauseType: string; tier: SeverityTier }[];

/**
 * A dangerous clause, placed in a tier, with the sentence it came from. The
 * citation is required and can only come from `locateCitation`, so a flag
 * without a verified source can't exist.
 */
export interface Flag {
  citation: Citation;
  /** A library slug such as "auto-renewal", or the model's own slug for a clause outside the library. */
  clauseType: string;
  severity: SeverityTier;
  axis: SeverityAxis;
  /** The judgment half of the flag, in the hedged voice. */
  rationale: string;
}

/** What happened to the model's proposed flags on the way to `flags`. */
export interface Verification {
  /** Flags the model proposed. */
  proposed: number;
  /** Flags that survived and are in `Analysis.flags`. */
  kept: number;
  /** Proposed flags whose quote isn't in the document. */
  droppedNoSource: number;
  /** Proposed flags missing a field or carrying an unknown tier or axis. */
  droppedInvalid: number;
  /** Proposed flags citing a span another kept flag already cites. */
  droppedDuplicate: number;
  /** Kept flags whose rationale asserted something the quote doesn't contain. */
  rationalesReplaced: number;
}

export interface Analysis {
  /** Plain English, stating only what the document says. */
  summary: string;
  /** Critical, then serious, then worth noting; within a tier, in document order. */
  flags: Flag[];
  verification: Verification;
}
