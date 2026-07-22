# Agent Payment Control: current versus candidate

CONTRACT_STATUS=PROPOSED_CANDIDATE

## GET /v1/x402/agent/payment-risk-gateway

- Current: Current object: product, schema_version, evaluated_at, decision allow|review|deny, signing_directive, authorization_token, max_allowed_amount_usdc, intent, policy, risk, reasons, next_action, limitations.
- Candidate: optional outer envelope, explicit timing/evidence/usage metadata, typed error.
- Exact risk: high if imposed on v1; documentation-only has no runtime risk.
- Migration: keep v1; separately approve /v2 plus SDK adapter and dual contract tests.
- Auth open decision: x402 payment; no API-key/OAuth scope claimed
- Pricing open decision: Catalog conflict: runtime and README show 0.15 vs 0.005 USDC; verify before publication
- Other open decisions: owner, rate limit, evidence freshness/retention, retry and billing replay.

## Decision

Do not retrofit candidate shape or strict validation onto v1. Resolve contract owner, auth, billing, limits, evidence freshness, and retention before OpenAPI work.
