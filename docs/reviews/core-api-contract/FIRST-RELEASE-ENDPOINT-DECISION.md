# First-release endpoint decision handoff

TASK_ID=SG-DOCS-003

PHASE=PM_CONTRACT_DECISION_HANDOFF

SOURCE_DOCUMENTATION_PACKAGE=COMPLETE

LOCAL_VALIDATION=PASS

CORE_API_CONTRACT_APPROVAL=PENDING

HOSTED_GITBOOK_VISUAL_QA=BLOCKED_BY_AUTHORITY

PUBLICATION_READINESS=NOT_READY

All normalized contracts and response envelopes in this package remain documentation proposals. This handoff does not authorize a runtime route, production OpenAPI change, sandbox, live Test it, GitBook sync, or publication.

## Endpoint identity and contract evidence

| # | Service | Method | Path | Current route exists | Production runtime verified | Request contract source | Response contract source | OpenAPI status | Test evidence |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | Risk Source API | POST | `/v1/risk-source/address-risk` | No | No | Candidate: `risk-source/REQUEST-SCHEMAS.md`; grounded in current BCS GET wrapper inputs | Candidate: `risk-source/RESPONSE-SCHEMAS.md`; current comparison uses the BCS provider wrapper | Absent from production OpenAPI | Candidate fixtures validate; current BCS wrapper behavior is covered separately in repository tests |
| 2 | Agent Payment Control | GET | `/v1/x402/agent/payment-risk-gateway` | Yes | Yes, classified `VERIFIED_PUBLIC` by the approved inventory | Runtime product input schema and handler in `src/index.js`; reviewed in `agent-payment-control/REQUEST-SCHEMAS.md` | `buildAgentPaymentAuthorization` current object; reviewed in `agent-payment-control/RESPONSE-SCHEMAS.md` | Present in runtime-generated OpenAPI | `test/index.test.js` asserts the path and paid-route behavior; contract fixtures pass |
| 3 | Agentic Commerce Preflight | POST | `/v1/agentic-commerce/preflight` | Yes | No; implementation exists but production authority is unverified | Runtime OpenAPI/request parsing and `agentic-commerce/REQUEST-SCHEMAS.md` | Current preflight builder and `agentic-commerce/RESPONSE-SCHEMAS.md` | Present in runtime-generated OpenAPI | Route/OpenAPI and decision behavior tests pass locally; no production HTTP verification evidence |
| 4 | Approval & Signer Control | POST | `/v1/approval-signer/evaluate` | No | No | Candidate: `approval-signer-control/REQUEST-SCHEMAS.md`; grounded in existing signer-directive fields | Candidate: `approval-signer-control/RESPONSE-SCHEMAS.md`; no standalone current response is claimed | Absent from production OpenAPI | Candidate fixtures validate; no route-level runtime test exists |
| 5 | Merchant & x402 Trust | GET | `/v1/x402/base/merchant-trust` | Yes | Yes, classified `VERIFIED_PUBLIC` | Runtime product schema and `merchant-x402-trust/REQUEST-SCHEMAS.md` | Current merchant-trust builder and `merchant-x402-trust/RESPONSE-SCHEMAS.md` | Present in runtime-generated OpenAPI | `test/index.test.js` asserts path/schema and paid-route behavior; contract fixtures pass |
| 6 | Merchant & x402 Trust | GET | `/v1/x402/web/endpoint-preflight` | Yes | Yes, classified `VERIFIED_PUBLIC` | Runtime product schema and `merchant-x402-trust/REQUEST-SCHEMAS.md` | Current endpoint-preflight builder and `merchant-x402-trust/RESPONSE-SCHEMAS.md` | Present in runtime-generated OpenAPI | `test/index.test.js` asserts path/schema and paid-route behavior; contract fixtures pass |

## Operational readiness and recommended PM decision

| # | Auth status | Price status | Rate-limit status | Sample status | Sandbox status | Side effects | Public authority | Recommended PM decision |
|---:|---|---|---|---|---|---|---|---|
| 1 | TBD; no scope asserted | TBD; no approved price | Undocumented | Documentation fixture only; no live request | No key or isolated Base URL | Proposed read-only orchestration; no route exists | `PROPOSED_CANDIDATE` | `APPROVE_AS_PROPOSED_CANDIDATE` — permit clearly labelled design documentation only; do not put in live/current API Reference |
| 2 | Current x402 payment challenge; no API-key/OAuth scope claimed | **Conflict:** runtime registry `$0.15`; README `0.005 USDC` | Undocumented | Safe fixture available; no browser payment | No key or isolated Base URL | Read-only evaluation, but x402 payment/billing occurs | `CURRENT_ROUTE` / `VERIFIED_PUBLIC` | `RETURN_TO_DEVELOPER` — resolve the authoritative price and billing evidence before first-release publication |
| 3 | Current code unauthenticated; future auth/scope TBD | No verified catalog price | Undocumented | Credential-free sample representation exists; it is not production proof | No key or isolated Base URL | Evaluation only; no signing or settlement | `IMPLEMENTED_UNVERIFIED` | `APPROVE_DOCS_ONLY` — retain sample/onboarding documentation, but withhold current-production authority and live Test it pending production verification |
| 4 | TBD; no scope asserted | TBD; no approved price | Undocumented | Documentation fixture only; no live request | No key or isolated Base URL | Proposed directive evaluation only; must never sign or mint approval | `PROPOSED_CANDIDATE` | `APPROVE_AS_PROPOSED_CANDIDATE` — permit clearly labelled design documentation only; do not present as a current route |
| 5 | Current x402 payment challenge; no API-key/OAuth scope claimed | Verified catalog price `0.03 USDC` | Undocumented | Safe fixture available; no browser payment | No key or isolated Base URL | Read-only lookup, with x402 payment/billing | `CURRENT_ROUTE` / `VERIFIED_PUBLIC` | `APPROVE_CURRENT_CONTRACT` — subject to final auth, rate-limit, response capture, and public wording review |
| 6 | Current x402 payment challenge; no API-key/OAuth scope claimed | Verified catalog price `0.005 USDC` | Undocumented | Safe fixture available; no browser payment | No key or isolated Base URL | Performs remote endpoint inspection and x402 billing; implementation must enforce SSRF/redirect controls | `CURRENT_ROUTE` / `VERIFIED_PUBLIC` | `APPROVE_CURRENT_CONTRACT` — subject to final auth, rate-limit, SSRF/security, response capture, and public wording review |

## Required escalations

### Agent Payment price conflict

The runtime product registry is the active billing implementation source and says `$0.15`; README says `0.005 USDC`. PM must designate the authoritative value and require code/catalog/docs parity evidence. Until then, return the endpoint to the developer and do not publish a price.

### Routes that do not exist

Risk Source Address Risk and Approval & Signer Evaluate are documentation candidates only. PM may approve them as proposed candidates, defer them, or return them for implementation design. Approval must not be interpreted as deployment authorization.

### Agentic Commerce verification

Local route, OpenAPI, and tests exist, but production endpoint availability, production request/response capture, auth, billing, limits, and operational ownership are unverified. Docs-only sample authority is the maximum recommended approval in this round.

### Sandbox

No verified sandbox-key issuance flow or isolated sandbox Base URL exists. All six endpoints remain unavailable for sandbox execution; production browser Test it remains disabled.

### Candidate response envelope

The shared `data` / `meta` and `error` / `meta` presentation is not a current runtime contract. Applying it to existing v1 routes would be breaking. PM should keep it non-binding or commission a separately versioned `/v2` contract and migration plan.

## PM decision record

PM must select exactly one allowed decision for each row:

- `APPROVE_CURRENT_CONTRACT`
- `APPROVE_DOCS_ONLY`
- `APPROVE_AS_PROPOSED_CANDIDATE`
- `RETURN_TO_DEVELOPER`
- `DEFER_FROM_FIRST_RELEASE`
- `REJECT`

No first-release contract is approved until PM records the six decisions and resolves or accepts every escalation above.
