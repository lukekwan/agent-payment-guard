# First-release Home cards

**Recommendation:** show **exactly four** service cards immediately below the Hero. This incorporates the latest Round 3 visual correction and supersedes the earlier five-card working assumption.

The cards are discovery surfaces, not authorization to publish endpoints. Every route remains subject to the PM-approved public allowlist and endpoint-level contract review.

## 1. Agent Payment Control

| Field | Recommendation |
|---|---|
| Public service name | Agent Payment Control |
| One-line outcome | Evaluate policy, mandate, counterparty, amount, and risk before an agent pays. |
| Target developer | Agent platforms, wallets, and payment orchestrators that must stop or route an autonomous payment safely. |
| Approved endpoints | `GET /v1/x402/payment-guard/evaluate`; `GET /v1/x402/agent/payment-risk-gateway`; `GET /v1/x402/agent-risk/policy-decide` |
| Availability | Verified public production operations; paid, read-only evaluation; browser execution remains conditional. |
| Authentication | x402 payment challenge, endpoint-specific. |
| Billing model | x402; currently inventoried at $0.10, $0.15, and $0.10 respectively. Reverify before publication. |
| Safe sample availability | Documentation fixture/presentation only; not a live payment request. |
| Sandbox availability | Not verified; no public sandbox key issuance or Base URL. |
| CTA wording | **Explore API Reference** — only after the approved reference is implemented; until then classify as `FUTURE`. |

## 2. Agentic Commerce

| Field | Recommendation |
|---|---|
| Public service name | Agentic Commerce |
| One-line outcome | Inspect buyer, merchant, mandate, and purchase context before an agent proceeds. |
| Target developer | Agentic checkout, marketplace, procurement, and buyer-agent developers. |
| Approved endpoints | `GET /v1/agentic-commerce/preflight/sample` only. `POST /v1/agentic-commerce/preflight` remains implemented-unverified and is excluded. |
| Availability | Safe sample is available now; production integration route is not approved by this package. |
| Authentication | None for the GET sample. |
| Billing model | Free sample; no production billing claim. |
| Safe sample availability | Yes. The response is illustrative and no live purchase or payment occurs. |
| Sandbox availability | No verified sandbox. A sample endpoint is not a sandbox. |
| CTA wording | **View safe sample** (`SAMPLE_ONLY`). |

## 3. Approval & Signer Control

| Field | Recommendation |
|---|---|
| Public service name | Approval & Signer Control |
| One-line outcome | Interpret approval requirements and signer directives before execution authority is exercised. |
| Target developer | Wallet, custody, smart-account, KMS/HSM, and human-approval workflow teams. |
| Approved endpoints | No standalone public endpoint approved for this card. It links to approved response semantics and integration guidance only. Internal grant/issuer routes, scopes, payloads, and tables remain excluded. |
| Availability | Documentation/concept surface; production enforcement and route authority are restricted. |
| Authentication | Service-dependent; no generic API-key claim. |
| Billing model | Service-dependent; the card must not state a standalone price. |
| Safe sample availability | Yes, as a static `REQUIRE_APPROVAL` / `signer_directive` response example. |
| Sandbox availability | Not verified. |
| CTA wording | **Understand signer directives** (`AVAILABLE_NOW` as documentation, not API execution). |

## 4. Merchant & x402 Trust

| Field | Recommendation |
|---|---|
| Public service name | Merchant & x402 Trust |
| One-line outcome | Inspect merchant, origin, server, endpoint, and paid-resource evidence before purchase. |
| Target developer | x402 clients, marketplaces, agent browsers, and payment-aware API consumers. |
| Approved endpoints | `GET /v1/x402/base/merchant-trust`; `GET /v1/x402/web/endpoint-preflight`; `GET /v1/x402/x402/server-trust`; `GET /v1/x402/x402/origin-due-diligence`; `GET /v1/x402/x402/resource-compare`; `GET /v1/x402/agent/spend-route-plan` |
| Availability | Verified public production operations; paid, read-only evidence. |
| Authentication | x402 payment challenge. |
| Billing model | x402; currently inventoried from $0.005 to $0.05 per request. Reverify each endpoint before publication. |
| Safe sample availability | Documentation fixtures only. |
| Sandbox availability | Not verified. |
| CTA wording | **Explore trust APIs** — classify as `FUTURE` until the approved API Reference is implemented. |

## Families intentionally excluded from Home

| Family | Exclusion reason |
|---|---|
| Wallet & Transaction Evidence | Important but secondary to the first-release product story; retain as a collapsible API Reference family. |
| Agent / API Supply Chain | Retain in API Reference; it is not one of the four clearest first-viewport outcomes. |
| System & Audit | Operational/reference material, not a Home service card. |
| Compliance Evidence Providers | Requires provider, legal, privacy, freshness, and coverage review before marketing prominence. |
| RPC & Chain-data Readiness | Secondary integration family with production-only/provider gaps. |
| SDK & MCP | Integration methods, not API service families; show later on Home only when package/version/authority are verified. |
| Decision Lifecycle / `deploy_change` preview | Candidate-only, absent from the verified production contract, and must not define the portal. |
| High-value BCS snapshot/delta products | Omitted from Home because $99/$499 automatic-payment exposure requires a separate safety decision. |

## Home order

1. Hero
2. Four service cards
3. Safe sample
4. Five-minute quickstart
5. Response / decision explanation
6. SDK / MCP
7. Changelog / Help Center / Support

The first desktop viewport must reveal at least the start of the four-card catalog. Support is a secondary action; the primary paths are Search docs, Explore API Reference, and Start with a safe sample.
