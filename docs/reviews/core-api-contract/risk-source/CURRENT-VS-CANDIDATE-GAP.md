# Risk Source API: current versus candidate

CONTRACT_STATUS=PROPOSED_CANDIDATE

## POST /v1/risk-source/address-risk

- Current: No current response at this path. Current BCS routes return product/schema_version/network/upstream_status/upstream_headers/upstream_response/provenance/limitations.
- Candidate: optional outer envelope, explicit timing/evidence/usage metadata, typed error.
- Exact risk: high if imposed on v1; documentation-only has no runtime risk.
- Migration: keep v1; separately approve /v2 plus SDK adapter and dual contract tests.
- Auth open decision: TBD; no scope asserted
- Pricing open decision: TBD; no approved price
- Other open decisions: owner, rate limit, evidence freshness/retention, retry and billing replay.

## Decision

Do not retrofit candidate shape or strict validation onto v1. Resolve contract owner, auth, billing, limits, evidence freshness, and retention before OpenAPI work.
