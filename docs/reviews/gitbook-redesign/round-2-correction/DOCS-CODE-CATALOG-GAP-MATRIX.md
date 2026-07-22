# Docs / Code / Catalog Gap Matrix

**Audit date:** 2026-07-22  
**Publication state:** blocked pending P0/P1 resolution or explicit PM disposition.

## Source comparison

| Surface | Audited evidence |
| --- | --- |
| Route implementation | `src/index.js`, `src/signgate-decision.js`, dispatch branches and `PAID_PATHS` |
| Tests | `test/index.test.js`, decision, SDK and MCP test files; `npm test` = 62/62 |
| Public/internal candidate contracts | `docs/openapi/signgate-public-v0.1.openapi.json`, `signgate-internal-v0.1.openapi.json` |
| Production machine contracts | `/openapi.json`, `/catalog.json`, `/.well-known/x402`, `/.well-known/mcp.json` snapshot on 2026-07-22 |
| Prose | `README.md`, `AI_BUYER_CATALOG.md`, current 97-page GitBook, historical/PM-approved artifacts |
| Clients | JavaScript/Python SDKs and MCP tool mapping |

## Gaps

| ID | Gap type | Finding and evidence | Severity | Owner | Recommended action | Blocks publication |
| --- | --- | --- | --- | --- | --- | --- |
| G-01 | planned endpoint presented as live; production/preview mismatch | Current GitBook centers `POST /v1/decisions` and consume as the public platform. Candidate OA/branch contain them, but production OA/runtime do not. | P0 | PM | Reclassify both as Preview Use Case; remove from canonical executable reference pending contract approval and deployment evidence. | true |
| G-02 | route exists but docs missing | Production exposes 83 catalog products / 85 paid operations; GitBook documents only two candidate operations. | P0 | Docs | Generate service-led reference from an approved production contract after PM selects the publishable subset. | true |
| G-03 | production/branch drift | Ten production catalog routes are absent from audited branch route source and tests. | P0 | Developer | Identify deployed SHA; reconcile or backport route/test evidence before public reference. | true |
| G-04 | OpenAPI/catalog mismatch | Production x402/OA include POST `/v1/x402/payment-guard/policies`, but catalog has no product row for it. | P1 | Developer | Decide whether it is a product operation; align catalog, x402, OA, tests, and price authority. | true |
| G-05 | OpenAPI drift | Branch public candidate OA has two decision operations, while runtime OA has 86 paths/87 operations and lacks those candidates. | P0 | PM | Name artifacts explicitly `candidate-preview`; nominate one approved generated public OA for GitBook. | true |
| G-06 | internal endpoint exposed publicly | Current public source discusses internal Founder approval boundary; internal OA contains the grant issuer. | P0 | Docs | Keep route/scope/payload only in internal documentation; public text should describe approval behavior without issuer details. | true |
| G-07 | host mismatch | GitBook Test it defaults to placeholder/local host and cannot prove a request reaches an approved environment. | P0 | Docs | Disable executable blocks until Tier A sample host or Tier B sandbox host is approved. | true |
| G-08 | auth mismatch | Candidate docs use API-key scopes; production public x402 routes use x402, while hidden SDK routes imply agent/owner tokens with unresolved scopes. | P0 | PM | Publish an endpoint-level auth matrix; do not generalize one scheme across services. | true |
| G-09 | enum mismatch | Payment Guard, authorization, buyer-policy, agentic preflight, MCP, and candidate decisions use different values/casing/directives. | P0 | PM | Select taxonomy strategy A/B/C; until then document service-local contracts exactly. | true |
| G-10 | status claim mismatch | Approved preview claims artifact says commerce/x402 is not live, but runtime has catalog, x402 discovery, 83 paid products and a sample endpoint. | P0 | PM | Re-review the claims artifact against dated runtime evidence; do not silently overwrite either authority. | true |
| G-11 | request/response schema coverage | Many runtime product schemas are generated in OA but current GitBook has no endpoint pages/examples; candidate examples cover only deploy_change. | P1 | Docs | Generate reference/examples from the PM-approved OA subset and validate fixtures against JSON Schema. | true |
| G-12 | pricing documentation missing | Production prices span $0.003–$499; current GitBook does not expose the catalog and does not warn against browser auto-payment. | P1 | Docs | Publish price from one approved catalog source; show confirmation for paid/high-value operations. | true |
| G-13 | pricing authority drift risk | Production has ten additional products/prices not in branch configuration. No observed mismatches among the 73 shared products, but branch cannot authoritatively regenerate all production prices. | P1 | Developer | Reconcile deployed config before claiming pricing parity. | true |
| G-14 | SDK method missing from docs | SDKs call evaluate, status, approvals, lifecycle and delivery routes; public GitBook documents none of those SDK workflows. | P1 | Docs | Add SDK guide only for methods whose route/auth/package status is approved. | false |
| G-15 | SDK/OpenAPI mismatch | Hidden SDK service routes are intentionally omitted from marketplace OA, leaving no approved public contract for client methods. | P1 | PM | Decide public vs partner/internal authority and provide a separate approved service OA if public. | true |
| G-16 | MCP/documentation mismatch | Public MCP discovery advertises `evaluate_payment` mapped to agentic preflight; GitBook does not explain MCP or its decision/signer semantics. | P1 | Docs | Add MCP integration after POST authority, auth, and safe test mode are confirmed. | false |
| G-17 | test missing | Ten production-only products have no source/test evidence in the branch; stateful production POSTs were not safely smoke-tested. | P0 | QA | Test the deployed SHA in an authorized sandbox; attach method/status/schema evidence. | true |
| G-18 | OpenAPI missing | Hidden payment authorization/guard management routes exist in code/SDK but are intentionally absent from public marketplace OA. | P1 | PM | Keep out of public reference unless a separate approved contract and audience are established. | true |
| G-19 | duplicate service naming | Multiple address-risk, payment-guard, preflight, wallet-risk, and policy-decision products overlap without a clear service hierarchy. | P2 | PM | Approve service families and endpoint naming rules; retain exact route names in reference. | false |
| G-20 | browser safety | GitBook OpenAPI Test it could run paid or stateful operations and retain a key unless explicitly configured. | P0 | Reviewer | Use read-only sample runner first; require sandbox proxy, masking, no analytics secrets, and route allowlist before live execution. | true |
| G-21 | runtime CORS/observability unknown | Browser compatibility, rate-limit headers, latency telemetry and request IDs have not been verified for a sandbox. | P1 | Developer | Specify and test sandbox CORS, rate limits, request ID, logs, and credential deletion. | true |
| G-22 | bilingual navigation | One `SUMMARY.md` lists English and Chinese trees together. | P1 | Docs | Use GitBook language variants or independent locale trees with separate navigation. | true |
| G-23 | content density | 97 Markdown pages describe two candidate operations while most live services are absent. | P1 | Docs | Apply the consolidation plan before adding generated reference. | false |
| G-24 | validation overclaim | Current PASS checks structure/links/syntax, not route/contract/runtime truth. | P0 | QA | Rename to `DOCUMENT_STRUCTURE_VALIDATION=PASS`; implement the 28-check correctness plan next phase. | true |
| G-25 | public authority not encoded | OA/catalog presence is currently treated as implicit authority, despite production drift and PM candidate artifacts. | P0 | PM | Maintain an endpoint allowlist with authority owner, status, approved wording, and expiry/review date. | true |
| G-26 | provider/legal wording | BCS/Sumsub evidence products are discoverable but provider terms, data freshness, privacy and legal limits are not documented in GitBook. | P1 | Reviewer | Complete provider/legal/security review before detailed publication. | true |
| G-27 | deprecated endpoint check | No endpoint was proven deprecated, but no deprecation registry or response-header check exists. | P2 | PM | Add lifecycle/deprecation owner and headers to the validation contract. | false |
| G-28 | production POST evidence withheld | Safe inventory authorization did not justify sending stateful/payment POSTs to production; runtime status remains not tested. | P1 | QA | Create non-production fixtures and explicit smoke-test authorization; do not use production as a sandbox. | true |

## Conflict totals used in the correction report

These counts are category counts, not mutually exclusive issue counts:

- `CATALOG_DOC_CONFLICTS=3` (G-02, G-04, G-12)
- `OPENAPI_ROUTE_CONFLICTS=4` (G-03, G-04, G-05, G-18)
- `DOC_ROUTE_CONFLICTS=5` (G-01, G-02, G-06, G-14, G-16)
- `PRICING_CONFLICTS=2` (G-12, G-13)
- `AUTH_CONFLICTS=2` (G-08, G-15)
- `STATUS_CLAIM_CONFLICTS=3` (G-01, G-10, G-25)
- `DECISION_TAXONOMY_CONFLICTS=5` (the five distinct contract families in the taxonomy matrix)

No shared 73-product price mismatch was observed. The pricing conflict is authority/drift and documentation coverage, not a fabricated numeric difference.
