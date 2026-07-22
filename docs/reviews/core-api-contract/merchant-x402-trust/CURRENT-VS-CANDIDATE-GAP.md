# Merchant & x402 Trust: current versus candidate

CONTRACT_STATUS=PROPOSED_CANDIDATE

## GET /v1/x402/base/merchant-trust

- Current: Current merchantTrust service object, not normalized envelope.
- Candidate: optional outer envelope, explicit timing/evidence/usage metadata, typed error.
- Exact risk: high if imposed on v1; documentation-only has no runtime risk.
- Migration: keep v1; separately approve /v2 plus SDK adapter and dual contract tests.
- Auth open decision: x402 payment; no API-key/OAuth scope claimed
- Pricing open decision: Verified catalog price 0.03 USDC
- Other open decisions: owner, rate limit, evidence freshness/retention, retry and billing replay.

## GET /v1/x402/web/endpoint-preflight

- Current: Current buildX402EndpointPreflight service object, not normalized envelope.
- Candidate: optional outer envelope, explicit timing/evidence/usage metadata, typed error.
- Exact risk: high if imposed on v1; documentation-only has no runtime risk.
- Migration: keep v1; separately approve /v2 plus SDK adapter and dual contract tests.
- Auth open decision: x402 payment; no API-key/OAuth scope claimed
- Pricing open decision: Verified catalog price 0.005 USDC
- Other open decisions: owner, rate limit, evidence freshness/retention, retry and billing replay.

## Decision

Do not retrofit candidate shape or strict validation onto v1. Resolve contract owner, auth, billing, limits, evidence freshness, and retention before OpenAPI work.
