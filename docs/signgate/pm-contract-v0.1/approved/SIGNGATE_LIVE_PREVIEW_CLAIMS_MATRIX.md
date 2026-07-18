# SignGate Live / Preview Claims Matrix v0.1

Date verified: 2026-07-18
Owner: Nomos Labs — PM
Status: REVISED AFTER FOUNDER PRE-APPROVAL — FINAL GATE APPROVAL PENDING

## Status vocabulary

- [FACT] `LIVE` means directly reachable and verified on the cited surface on the verification date.
- [FACT] `PREVIEW` means usable for evaluation but not represented as a production service or stable public contract.
- [FACT] `PLANNED` means approved product direction with no verified deployed capability.
- [FACT] `NOT DEPLOYED` means there is no verified public production endpoint.
- [FACT] `DIRECTION` means a future technical/product direction, not a committed live capability.

## Claims matrix

| Capability / claim | Status | Evidence | Allowed public wording | Prohibited wording |
|---|---|---|---|---|
| Nomos platform narrative | LIVE | [FACT] Temporary demo displays TEST → DECIDE → MONITOR. | [FACT] “Nomos Labs covers testing, decision, and monitoring.” | [FACT] Do not imply all three products are production APIs. |
| Agent Assurance | SERVICE / PILOT | [FACT] Live site labels it as service/pilot. | [FACT] “Available for pilot engagements.” | [FACT] Do not claim a self-serve production platform. |
| SignGate product page | PREVIEW / IN DEVELOPMENT | [FACT] Live page carries that badge. | [FACT] “Preview of the SignGate decision contract and use cases.” | [FACT] Do not claim general availability. |
| x402scan page | PREVIEW / IN DEVELOPMENT | [FACT] Live home page carries that badge. | [FACT] “Preview / in development.” | [FACT] Do not claim continuous production monitoring for customers. |
| Browser-based deterministic decision demo | PREVIEW | [FACT] Live site links to an interactive Decision Preview; supplied source implements deterministic local rules. | [FACT] “Interactive deterministic preview.” | [FACT] Do not call it the production Decision API. |
| `POST /v1/decisions` | PLANNED / NOT DEPLOYED | [FACT] No production API base URL is configured. | [FACT] “Frozen v0.1 contract; preview endpoint to be implemented after approval.” | [FACT] Do not publish an “available now” badge before endpoint verification. |
| `/v1/agentic-commerce/preflight` | DOCUMENTED_NON_LIVE_STUB | [FACT] Live page references the route; docs say production API is not configured; Founder limited sprint one to mapping/schema/aliases/contract tests/docs. | [FACT] “Documented compatibility stub; preview/planned/not deployed.” | [FACT] Do not describe it as a verified API or complete payment/x402 enforcement adapter. |
| GitBook | NOT CONFIGURED | [FACT] Live docs page states GitBook is not configured. | [FACT] “In-repo/static docs are the current documentation surface.” | [FACT] Do not display “GitBook ready” as an availability claim. |
| Production API base URL | NOT CONFIGURED | [FACT] Live docs page says it is not configured. | [FACT] “Preview access only; production base URL unavailable.” | [FACT] Do not publish curl commands against an invented production host. |
| Contact intake via Formspree | LIVE | [FACT] Live contact copy states submissions go to Formspree and Worker does not store form contents. | [FACT] “Contact requests are forwarded through Formspree.” | [FACT] Do not claim CRM storage or a customer portal. |
| Expanded lead qualification fields | PLANNED | [FACT] Live form currently has only name, email, organization, and message. | [FACT] “Additional action-control questions planned.” | [FACT] Do not claim these fields are already collected. |
| Action-bound execution directive | CONTRACT PROPOSED | [FACT] The PM contract defines fingerprint, expiry, policy version, and exact bound action. | [FACT] “Part of proposed v0.1 contract.” | [FACT] Do not claim enforcement until wrapper tests pass. |
| Reference deployment enforcement wrapper | PLANNED | [FACT] Required by the sprint; no verified artifact exists in the supplied source. | [FACT] “Internal dogfood target.” | [FACT] Do not claim production deployments are currently gated by SignGate. |
| `POST /v1/decisions/{decision_id}/consume` | PLANNED / INTERNAL OR PREVIEW-PROTECTED | [FACT] Founder approved the contract surface with a scope limit; it is not implemented. | [FACT] “Planned internal/preview-protected enforcement surface.” | [FACT] Do not call it a generally available production API. |
| Scoped API-key authentication and tenant binding | PLANNED / NOT DEPLOYED | [FACT] Founder approved preview contract semantics; no implementation is verified. | [FACT] “Planned preview access control.” | [FACT] Do not claim IAM, SSO, RBAC, or enterprise identity availability. |
| Trusted approval grant flow | PLANNED / INTERNAL DOGFOOD | [FACT] Founder approved immutable approval semantics; no approval service/dashboard is deployed. | [FACT] “Planned internal dogfood approval control.” | [FACT] Do not claim a customer approval inbox or production approval service. |
| Universal wallet/signer/deploy enforcement | DIRECTION | [FACT] Public copy already distinguishes current decision capability from future enforcement. | [FACT] “Technical direction.” | [FACT] Do not claim universal enforcement today. |

## Website changes after contract freeze

- [FACT] Preserve the Nomos company narrative and three-layer architecture.
- [FACT] Replace generic endpoint references with `POST /v1/decisions` as canonical, while labeling commerce preflight as a compatibility adapter.
- [FACT] Use only `ALLOW`, `REQUIRE_APPROVAL`, and `DENY` for external decision values.
- [FACT] Lead the SignGate page with a deployment-control example; keep external messaging as secondary and payment/x402 as supported.
- [FACT] Label each endpoint and capability as `LIVE`, `PREVIEW`, `PLANNED`, or `NOT DEPLOYED`.
- [FACT] Add contact questions for controlled action, agent stack, frequency, current approval method, feared failure, and audit needs.
- [FACT] Do not change website copy until Founder approves Gate 1.

## Verification notes

- [FACT] Live verification was performed against the temporary trycloudflare URL on 2026-07-18.
- [ASSUMPTION] The temporary URL can expire or change and is not a durable source of availability truth.
- [INFERENCE] Release QA must rerun the claims matrix against the actual release candidate URL immediately before `RELEASE_CANDIDATE_GATE=PASS`.
