# SignGate documentation publication workflow

This document defines the release gates for the public SignGate developer documentation. A successful draft or Git Sync preview is not publication approval.

| Gate | Owner | Deliverable | Exit criteria | Current status |
| --- | --- | --- | --- | --- |
| Inventory and IA | Codex Docs | Source inventory, audience boundary, navigation tree | Public pages resolve; English is default; Traditional Chinese mirrors the hierarchy | Complete |
| Public API scope | Codex PM | Candidate public contract | Only approved public endpoints and schemas appear in the public OpenAPI document | Candidate: two endpoints; reviewer approval pending |
| English candidate | Codex Docs | Complete English portal | Overview, concepts, reference, guides, security, examples, and resources are present | Complete |
| Functional and visual QA | QA | Validation report and screenshots | Links, examples, API testing affordances, desktop, and mobile pass | Complete for candidate: desktop, 375 px mobile, and both Test it blocks passed |
| Contract and security review | Reviewer | Review decision | Contract matches implementation; internal controls and founder-only material remain private | Pending |
| Traditional Chinese candidate | Codex Docs | Equivalent Traditional Chinese portal | Navigation and safety semantics match the approved English candidate | Complete; final parity check follows reviewer changes |
| Publication approval | Founder | Explicit approval | Founder approves the final GitBook revision and site-level customization | Pending |

## Publication controls

- Keep GitHub work in a draft pull request until review gates pass.
- Keep GitBook work in a change request or revision preview until the Founder explicitly approves publication.
- Do not merge, publish, delete drafts, or change public-site customization as part of validation.
- Re-run documentation validation after every contract, navigation, localization, or example change.
- Record the exact Git commit and GitBook revision that the Founder approves.

## Current candidate boundary

The public candidate contains only:

- `POST /v1/decisions`
- `POST /v1/decisions/{decision_id}/consume`

Everything else remains internal unless Codex PM and the contract/security reviewer approve it for a later candidate.
