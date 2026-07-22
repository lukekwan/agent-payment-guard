# Agent Payment Control: request schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## GET /v1/x402/agent/payment-risk-gateway

- Purpose: Evaluate payment intent policy and risk.
- Availability: Verified current public x402 wrapper
- Authentication / required scope: x402 payment; no API-key/OAuth scope claimed
- Billing / price: Catalog conflict: runtime and README show 0.15 vs 0.005 USDC; verify before publication
- Headers: Accept application/json; POST also requires Content-Type application/json. x402 routes use payment challenge/proof headers. Candidate Authorization is TBD.
- Parameters and body: Query required request_id, agent_id, purpose, pay_to, amount_usdc, nonce. Optional session_id, invoice_id, invoice_hash, expires_at ISO-8601 default now+5m, max_single_usdc decimal default 0.10, human_review_above_usdc decimal default 0.09, allow_pay_to/block_pay_to CSV, risk_score number default 0, risk_labels CSV. No body; omitted optional values use defaults.
- Idempotency: read-only evaluation. Repeats can return fresher evidence and may be separately billed. No storage-level idempotency is claimed; candidate Idempotency-Key requires approval.
- Time: query_time is SignGate completion; data_time is authoritative evidence time only when supplied; latency_ms measures request receipt to response completion.
- Evidence/mandate: optional opaque references only; never fabricate evidence_id or mandate authority.
- Security: Caller-supplied risk is not authoritative evidence. Do not remap the decision vocabulary.
