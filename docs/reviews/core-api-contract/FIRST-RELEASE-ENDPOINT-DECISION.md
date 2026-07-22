# First-release endpoint decision handoff

TASK_ID=SG-DOCS-003

PHASE=PM_CONTRACT_DECISION_HANDOFF

SOURCE_DOCUMENTATION_PACKAGE=COMPLETE

LOCAL_VALIDATION=PASS

CORE_API_CONTRACT_DECISION=RECORDED

DECISION=PARTIAL_APPROVAL

HOSTED_GITBOOK_VISUAL_QA=BLOCKED_BY_AUTHORITY

PUBLICATION_READINESS=NOT_READY

CURRENT_CONTRACTS_APPROVED=2

DOCS_ONLY_APPROVED=1

PROPOSED_CANDIDATES_APPROVED=2

RETURNED_TO_DEVELOPER=1

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

## Operational readiness and final PM decision

| # | Auth status | Price status | Rate-limit status | Sample status | Sandbox status | Side effects | Public authority | Final PM decision |
|---:|---|---|---|---|---|---|---|---|
| 1 | TBD; no scope asserted | TBD; no approved price | Undocumented | Documentation fixture only; no live request | No key or isolated Base URL | Proposed read-only orchestration; no route exists | `PROPOSED_CANDIDATE` | `APPROVE_AS_PROPOSED_CANDIDATE` — first-class core service and non-production contract only; exclude from executable/current API Reference and Test it; unified route explicitly does not exist |
| 2 | Current x402 payment challenge; no API-key/OAuth scope claimed | **Conflict:** runtime registry `$0.15`; README `0.005 USDC` | Undocumented | Safe fixture available; no browser payment | No key or isolated Base URL | Read-only evaluation, but x402 payment/billing occurs | `CURRENT_ROUTE` / `VERIFIED_PUBLIC` | `RETURN_TO_DEVELOPER` — identify billing source of truth; align runtime, catalog, README, docs, and tests; capture challenge and paid-response evidence; publish no price before correction |
| 3 | Current code unauthenticated; future auth/scope TBD | No verified catalog price | Undocumented | Credential-free sample representation exists; it is not production proof | No key or isolated Base URL | Evaluation only; no signing or settlement | `IMPLEMENTED_UNVERIFIED` | `APPROVE_DOCS_ONLY` — architecture, samples, decision semantics, and safe onboarding only; no production, Test it, sandbox, auth, billing, or rate-limit claim |
| 4 | TBD; no scope asserted | TBD; no approved price | Undocumented | Documentation fixture only; no live request | No key or isolated Base URL | Proposed directive evaluation only; must never sign, mint approval, or enforce execution | `PROPOSED_CANDIDATE` | `APPROVE_AS_PROPOSED_CANDIDATE` — documentation/contract design only; not a current route; no Test it or production claim |
| 5 | Current x402 payment challenge; no API-key/OAuth scope claimed | Catalog value `0.03 USDC`, pending production verification | Undocumented | Safe fixture available; no browser payment | No key or isolated Base URL | Read-only lookup, with x402 payment/billing | `CURRENT_ROUTE` / `VERIFIED_PUBLIC` | `APPROVE_CURRENT_CONTRACT` — publication remains blocked on real production request/response, price, challenge, limits, errors, and wording verification |
| 6 | Current x402 payment challenge; no API-key/OAuth scope claimed | Catalog value `0.005 USDC`, pending production verification | Undocumented | Safe fixture available; no browser payment | No key or isolated Base URL | Performs remote endpoint inspection and x402 billing; SSRF/redirect controls require review | `CURRENT_ROUTE` / `VERIFIED_PUBLIC` | `APPROVE_CURRENT_CONTRACT` — publication remains blocked on real production request/response, price, challenge, limits, errors, SSRF/redirect review, and wording verification |

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

## First-release authority lists

### Current contract API Reference allowlist

- `GET /v1/x402/base/merchant-trust`
- `GET /v1/x402/web/endpoint-preflight`

### Docs-only surfaces

- `POST /v1/agentic-commerce/preflight` — label `IMPLEMENTED_UNVERIFIED`

### Proposed candidate surfaces

- `POST /v1/risk-source/address-risk`
- `POST /v1/approval-signer/evaluate`

### Returned to developer

- `GET /v1/x402/agent/payment-risk-gateway`

## PM decision record

PM must select exactly one allowed decision for each row:

- `APPROVE_CURRENT_CONTRACT`
- `APPROVE_DOCS_ONLY`
- `APPROVE_AS_PROPOSED_CANDIDATE`
- `RETURN_TO_DEVELOPER`
- `DEFER_FROM_FIRST_RELEASE`
- `REJECT`

The six PM decisions are recorded. Contract authority is partially approved, but publication readiness remains blocked by the endpoint-specific conditions above. See `handoffs/` for the three follow-up packages.
