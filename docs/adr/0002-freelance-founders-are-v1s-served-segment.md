# 2. Freelancers and early-stage founders are v1's served segment

## Decision

Redline v1 is built for freelancers and early-stage founders reviewing freelance/consulting agreements, and is tuned — clause library, severity defaults, summary language — around that document type first. Renters/tenants and job-offer reviewers are not served in v1, even though the research found them to be, respectively, the segment with the sharpest documented pain and the segment with the only confirmed willingness to pay.

## Alternatives considered

- **Renters/tenants.** The single sharpest, most viscerally documented pain point in the research (auto-renewal clauses blindsiding tenants), but no evidence anyone in this segment has ever paid for contract review — willingness to pay is unconfirmed, not just unpriced.
- **Job-offer/employment-contract reviewers.** The only segment with confirmed willingness to pay ($800–$1,500, called "worth it"), but a one-time, occasional use case that doesn't exercise a saved library of past documents, and isn't a repeat user.
- **Equally general-purpose across all four document types** (contract, lease, freelance agreement, ToS), as CLAUDE.md's scope list reads on its face. Rejected as not actually achievable in a first version — a v1 tuned for everything is sharp for nothing.

## Why

Freelancers/founders are the only segment where documented pain, the product's own stated purpose (a cheap, trustworthy alternative to $650–$870 lawyer review), and a repeat-use pattern (freelancers sign agreements regularly, unlike a one-time employment contract) line up together. The tradeoff is explicit: this version is not optimized for the segment with the loudest pain (renters) or the segment with the clearest ability to pay (job-offer reviewers).

Pricing is deliberately not used to break this tie: CLAUDE.md already excludes payments/billing from this version, so v1's job is to prove the analysis can be trusted, not to prove someone will pay for it. Employment contracts get no special hedge-treatment to keep that segment's optionality open — that would contradict what "not serving a segment" means.

## Consequences

- Clause library, default severities, and plain-English summary tone are built around freelance/consulting agreements (IP assignment, scope creep, kill fees, payment terms) rather than lease or ToS-specific patterns, even though the app accepts all four document types on day one.
- Lease and ToS uploads get Redline's generic pass in v1, not a tuned one — despite leases being where the research found the strongest, most concrete pain evidence.
- Future work aimed at renters (the highest-pain, unconfirmed-WTP segment) or job-offer reviewers (the highest-WTP, lowest-frequency segment) is an explicit expansion decision, not an oversight to "fix" later.
