/**
 * Illustrative material for the landing page only.
 *
 * Brightfall Studio Ltd. is invented, and so is every clause below. No real
 * client document was used (PRODUCT.md, "Evidence on Hand"). Every `quote`
 * appears verbatim in `AGREEMENT` — that containment is the thing the page
 * demonstrates, so it is worth keeping true by hand.
 */

export type Tier = "critical" | "serious" | "noted";

export type Finding = {
  id: string;
  section: string;
  heading: string;
  /** null means no clause-level risk was found — a red-line match on its own. */
  tier: Tier | null;
  /** The reader's own red line, when this clause matched one. */
  redLine?: string;
  quote: string;
  reading: string;
};

export const TIER_LABEL: Record<Tier, string> = {
  critical: "Critical",
  serious: "Serious",
  noted: "Worth noting",
};

export const DOCUMENT_NAME = "Consulting Services Agreement";
export const DOCUMENT_PARTIES = "Brightfall Studio Ltd. and Contractor";
export const DOCUMENT_LOT = "LOT 4471·02  PAGES 6  SECTIONS 8";

export const SUMMARY =
  "It runs twelve months and renews on its own, pays undisputed invoices on sixty-day terms, assigns work product to the client, and sends any dispute to binding arbitration. Four clauses shift risk, cost, or control onto the contractor. One more is here only because it matches a red line you set.";

export const FINDINGS: Finding[] = [
  {
    id: "renewal",
    section: "2.3",
    heading: "Term and renewal",
    tier: "critical",
    quote:
      "This Agreement shall renew automatically for successive twelve (12) month terms unless Contractor delivers written notice of non-renewal not less than ninety (90) days before the end of the then-current term.",
    reading:
      "The renewal happens on its own, and the only way out is a notice you have to remember to send three months early. Miss the window and the next twelve months are committed. Easy to skim past and expensive to reverse: that pairing is what puts it at the top, rather than the size of the sum involved.",
  },
  {
    id: "payment",
    section: "3.2",
    heading: "Fees and payment",
    tier: null,
    redLine: "Nothing longer than net 30.",
    quote:
      "Client shall pay all undisputed invoices within sixty (60) days of receipt.",
    reading:
      "No severity tier. Sixty-day terms do not shift risk, cost, or control by Redline's own bar, so it would not have been flagged. It is here because you asked for it, and your list is not something Redline's judgment gets to overrule.",
  },
  {
    id: "ip",
    section: "4.1",
    heading: "Ownership of work product",
    tier: "serious",
    redLine: "Never assign anything I built before the project.",
    quote:
      "Contractor assigns to Client all right, title, and interest in any pre-existing tools, methods, libraries, or materials incorporated into the Deliverables.",
    reading:
      "The assignment reaches past the deliverable into work that existed before this engagement. The agreement does not define what counts as incorporated, so the reach is probably wider than it reads. Hard to undo: once signed, reuse and portfolio rights are gone.",
  },
  {
    id: "indemnity",
    section: "5.1",
    heading: "Indemnification",
    tier: "serious",
    quote:
      "Contractor shall indemnify, defend, and hold harmless Client against any and all claims, losses, damages, and expenses arising out of the Services, without limitation as to amount.",
    reading:
      "You cover the client's losses arising out of the work, and the clause states there is no cap. The exposure here could be larger than anything else in the document. It ranks below the renewal clause only because it sits under its own labelled heading, where a careful reader will find it.",
  },
  {
    id: "arbitration",
    section: "7.1",
    heading: "Dispute resolution",
    tier: "noted",
    quote:
      "Any dispute arising under this Agreement shall be resolved exclusively by binding arbitration, and each party waives any right to participate in a class or collective action.",
    reading:
      "Court is off the table and so is joining a group claim. It moves leverage toward the client, but it is labelled plainly and sits where you would expect to find it.",
  },
];

export type Segment = { text: string; findingId?: string };

export type Clause = {
  number: string;
  heading: string;
  body: Segment[];
};

export const AGREEMENT: Clause[] = [
  {
    number: "1",
    heading: "Engagement and scope",
    body: [
      {
        text: "Client engages Contractor to perform the services described in one or more statements of work executed by both parties (the “Services”). Each statement of work shall specify the deliverables, schedule, and fees applicable to it. Contractor shall perform the Services as an independent contractor and not as an employee, partner, or agent of Client.",
      },
    ],
  },
  {
    number: "2",
    heading: "Term and renewal",
    body: [
      {
        text: "This Agreement begins on the Effective Date and continues for an initial term of twelve (12) months. Either party may propose amendments in writing at any time during the term. ",
      },
      {
        text: "This Agreement shall renew automatically for successive twelve (12) month terms unless Contractor delivers written notice of non-renewal not less than ninety (90) days before the end of the then-current term.",
        findingId: "renewal",
      },
      {
        text: " Notice delivered after that date shall be of no effect for the term then commencing.",
      },
    ],
  },
  {
    number: "3",
    heading: "Fees and payment",
    body: [
      {
        text: "Contractor shall invoice Client monthly in arrears for Services performed. ",
      },
      {
        text: "Client shall pay all undisputed invoices within sixty (60) days of receipt.",
        findingId: "payment",
      },
      {
        text: " Client shall notify Contractor of any disputed amount within fifteen (15) days of receipt of the relevant invoice, and the parties shall confer in good faith to resolve it.",
      },
    ],
  },
  {
    number: "4",
    heading: "Ownership of work product",
    body: [
      {
        text: "All deliverables prepared by Contractor in performance of the Services shall be the exclusive property of Client upon payment in full. ",
      },
      {
        text: "Contractor assigns to Client all right, title, and interest in any pre-existing tools, methods, libraries, or materials incorporated into the Deliverables.",
        findingId: "ip",
      },
      {
        text: " Contractor shall execute such further documents as Client may reasonably request to perfect the foregoing assignment.",
      },
    ],
  },
  {
    number: "5",
    heading: "Indemnification",
    body: [
      {
        text: "Contractor shall indemnify, defend, and hold harmless Client against any and all claims, losses, damages, and expenses arising out of the Services, without limitation as to amount.",
        findingId: "indemnity",
      },
      {
        text: " This obligation shall survive the expiration or termination of this Agreement.",
      },
    ],
  },
  {
    number: "6",
    heading: "Confidentiality",
    body: [
      {
        text: "Each party shall hold the other party’s confidential information in confidence and shall not disclose it to any third party except as required by law. The obligations in this section shall continue for three (3) years following the termination of this Agreement.",
      },
    ],
  },
  {
    number: "7",
    heading: "Dispute resolution",
    body: [
      {
        text: "Any dispute arising under this Agreement shall be resolved exclusively by binding arbitration, and each party waives any right to participate in a class or collective action.",
        findingId: "arbitration",
      },
      {
        text: " Arbitration shall be conducted by a single arbitrator in the jurisdiction named in Section 8.",
      },
    ],
  },
  {
    number: "8",
    heading: "Governing law",
    body: [
      {
        text: "This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict-of-law principles. If any provision is held unenforceable, the remaining provisions shall continue in full force and effect.",
      },
    ],
  },
];
