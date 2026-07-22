# Agentic Commerce Preflight: current versus candidate

CONTRACT_STATUS=PROPOSED_CANDIDATE

## POST /v1/agentic-commerce/preflight

- Current: Current object: product, schema_version, response_kind, evaluator_version, decision ALLOW|REQUIRE_APPROVAL|DENY, decision_id, evaluated_at, expires_at, policy_version, action, agent, buyer, mandate, merchant, resource, reason_codes, evidence, signer_directive, decision_artifact, recommended_next_action, limitations.
- Candidate: optional outer envelope, explicit timing/evidence/usage metadata, typed error.
- Exact risk: high if imposed on v1; documentation-only has no runtime risk.
- Migration: keep v1; separately approve /v2 plus SDK adapter and dual contract tests.
- Auth open decision: Current code unauthenticated; future auth/scope TBD
- Pricing open decision: No verified billing entry or approved price
- Other open decisions: owner, rate limit, evidence freshness/retention, retry and billing replay.

## Decision

Do not retrofit candidate shape or strict validation onto v1. Resolve contract owner, auth, billing, limits, evidence freshness, and retention before OpenAPI work.
