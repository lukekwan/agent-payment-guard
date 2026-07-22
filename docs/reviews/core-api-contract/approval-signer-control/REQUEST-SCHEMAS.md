# Approval & Signer Control: request schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## POST /v1/approval-signer/evaluate

- Purpose: Derive a signer directive from a bound decision, action, and optional approval.
- Availability: Candidate; not deployed
- Authentication / required scope: TBD; no scope asserted
- Billing / price: TBD; no approved price
- Headers: Accept application/json; POST also requires Content-Type application/json. x402 routes use payment challenge/proof headers. Candidate Authorization is TBD.
- Parameters and body: JSON required request_id string 1–128, decision enum ALLOW|REQUIRE_APPROVAL|DENY, action object, signer object. Optional mandate object, approval object, decision_expires_at ISO-8601. Reject unknown fields/nulls. Action binds chain, asset, amount, destination, nonce where applicable.
- Idempotency: read-only evaluation. Repeats can return fresher evidence and may be separately billed. No storage-level idempotency is claimed; candidate Idempotency-Key requires approval.
- Time: query_time is SignGate completion; data_time is authoritative evidence time only when supplied; latency_ms measures request receipt to response completion.
- Evidence/mandate: optional opaque references only; never fabricate evidence_id or mandate authority.
- Security: Never return private keys or perform signing. Verify integrity, expiry, action binding, tenant, and signer class.
