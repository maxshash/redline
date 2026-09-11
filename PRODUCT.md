# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js, deployed on Vercel. Supabase for auth and database. Model calls go through OpenRouter. The uploaded file is parsed in the browser; only the extracted text is ever stored, never the original file. (Settled per CLAUDE.md — not open for reconsideration.)

## Users

Freelancers and early-stage founders reviewing freelance/consulting agreements, SOWs, and the leases/ToS/other contracts they encounter along the way — specifically people with no in-house counsel and no lawyer on retainer. Today this segment pays $650–$870 for a one-off lawyer review, gets a quote and doesn't proceed, or signs without review; the middle option is the common one. v1 is tuned specifically around freelance/consulting agreements (ADR 0002) — renters/tenants and job-offer/employment-contract reviewers are explicitly out of scope for v1, even though the app will technically accept their documents.

## Product Purpose

Redline lets a user upload a contract, extracts its text client-side, and returns a plain-English summary, clauses that shift risk/cost/control onto the user (each ranked into a severity tier and cited to its exact source sentence), a drafted counter-offer per flagged clause, a document-grounded Q&A box, an editable personal red-line list that surfaces independent matches, and a saved library of past uploads. Success for this version means proving the analysis can be trusted — not conversion, retention, or revenue.

## Positioning

The mechanism a neighboring "AI contract reader" can't casually copy: every risk flag is required to cite the exact source sentence it came from (a flag with no visible source is treated as a bug, ADR 0001), severity is ranked by how easy a clause is to miss and how hard its consequence is to undo rather than by dollar exposure (ADR 0003), a clean document with no flags is a valid and expected output rather than something the product avoids (ADR 0006), and the product deliberately trades precision for recall (ADR 0004) — false positives are treated as self-correcting, false negatives are not.

## Operating Context

A user uploads a document (contract, lease, freelance agreement, or ToS) that is parsed to text entirely in the browser — the original file is never transmitted or stored. Analysis and Q&A are two independent model calls through OpenRouter: `analyzeDocument(text, redLines) → Analysis` and `answerQuestion(text, question) → Answer` (the latter has no access to red lines or analysis output, and must not draw on outside knowledge). Documents, analyses, and red-line lists persist per-user in Supabase and are private to the uploading user. The user maintains an editable red-line list across sessions, which layers on top of Redline's own default clause library rather than replacing it.

## Capabilities and Constraints

- No OCR: only browser-extracted text is ever processed or stored; scanned/image-only documents are unsupported.
- Every flag must carry a verbatim, citable quote from the source text; there is no "flag without a quote" state, and counter-offers are only ever generated for flags that already have a valid citation.
- Severity is three named tiers (Critical / Serious / Worth noting) — no numeric score exists anywhere in the model (ADR 0003).
- A red-line match is a signal independent of severity tier; the two are never merged into one field or one list.
- The dangerous-clause bar is "shifts risk, cost, or control from a neutral default onto the user" — not any deviation from boilerplate, and not a fixed clause list. Clauses unusual purely in the user's favor are never surfaced ("good news" is out of scope).
- Default v1 clause library is tuned for freelance/consulting agreements specifically (full list in PRD.md "My red lines" section); leases/ToS/SaaS-vendor documents are accepted at upload but analyzed against these same defaults, not a tuned set of their own.
- Explicitly out of scope for this version: payments/billing, OCR, and sharing documents between users (see CLAUDE.md).
- Undecided / not yet established: a specific accessibility compliance standard (e.g. WCAG level) has not been confirmed; treat as no formal binding target until stated otherwise. No real sample/redacted contracts are confirmed on hand — any example content used in design or copy must be clearly fictional placeholder, never presented as a real case.

## Brand Commitments

Product name is "Redline." No logo, visual identity, or additional voice constraints have been established yet.

## Evidence on Hand

Extensive user research is checked into `research/` (four research-agent reports plus `research/summary.md`), used to justify every product decision in `PRD.md`. This is qualitative/secondary research (Reddit threads, advisory content, market-rate data), not user interviews conducted for this product, and not a source of testimonials, case studies, or usage data — none of those exist and none should be fabricated. No real sample contracts are confirmed on hand for design or test use (see Capabilities and Constraints).

## Product Principles

- A citation is the unit of trust: no flag, counter-offer, or answer may assert anything beyond what the quoted source text supports.
- Recall beats precision on danger signals; silence beats false confidence on everything else — the product would rather over-flag than miss the one clause that costs the user money.
- A clean result is a real result: "this document looks standard" must be as legible and trustworthy an outcome as a document full of flags.
- The user's own red-line list is a direct instruction, not a suggestion Redline's judgment gets to filter.
- Depth over breadth for v1: sharp defaults for one document type and one served segment beat shallow coverage of many.

## Accessibility & Inclusion

No specific compliance standard has been confirmed for v1 (see Capabilities and Constraints). Given the product serves as a substitute for legal review that users are price-resistant to, plain-language clarity and low cognitive load are functional requirements carried by Product Purpose, not a separate accessibility commitment.
