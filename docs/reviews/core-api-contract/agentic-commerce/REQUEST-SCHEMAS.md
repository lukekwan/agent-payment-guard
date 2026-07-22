# Agentic Commerce Preflight: request schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## POST /v1/agentic-commerce/preflight

- Purpose: Evaluate agent commerce action before execution.
- Availability: Implemented, documented non-live/verification-pending
- Authentication / required scope: Current code unauthenticated; future auth/scope TBD
- Billing / price: No verified billing entry or approved price
- Headers: Accept application/json; POST also requires Content-Type application/json. x402 routes use payment challenge/proof headers. Candidate Authorization is TBD.
- Parameters and body: JSON required agent_role string, product_category string, amount_usdc decimal string. Optional buyer_id, agent_id, action default payment_execution, asset default USDC, chain default base, merchant_domain, merchant_wallet, mandate object, merchant object. Current exact enums/min/max/unknown/null behavior require verification.
- Idempotency: read-only evaluation. Repeats can return fresher evidence and may be separately billed. No storage-level idempotency is claimed; candidate Idempotency-Key requires approval.
- Time: query_time is SignGate completion; data_time is authoritative evidence time only when supplied; latency_ms measures request receipt to response completion.
- Evidence/mandate: optional opaque references only; never fabricate evidence_id or mandate authority.
- Security: A decision is not a signature or settlement receipt. Enforce expiry and signer directive.
