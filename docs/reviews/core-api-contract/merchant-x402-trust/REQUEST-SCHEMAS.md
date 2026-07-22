# Merchant & x402 Trust: request schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## GET /v1/x402/base/merchant-trust

- Purpose: Assess a Base merchant wallet.
- Availability: Verified current public x402 wrapper
- Authentication / required scope: x402 payment; no API-key/OAuth scope claimed
- Billing / price: Verified catalog price 0.03 USDC
- Headers: Accept application/json; POST also requires Content-Type application/json. x402 routes use payment challenge/proof headers. Candidate Authorization is TBD.
- Parameters and body: Query required address matching 0x plus 40 hex chars. No body/path params. Unknown query fields currently ignored; null not representable.
- Idempotency: read-only evaluation. Repeats can return fresher evidence and may be separately billed. No storage-level idempotency is claimed; candidate Idempotency-Key requires approval.
- Time: query_time is SignGate completion; data_time is authoritative evidence time only when supplied; latency_ms measures request receipt to response completion.
- Evidence/mandate: optional opaque references only; never fabricate evidence_id or mandate authority.
- Security: Trust does not prove wallet ownership; freshness follows observed evidence.

## GET /v1/x402/web/endpoint-preflight

- Purpose: Inspect an HTTP(S) endpoint before x402 purchase.
- Availability: Verified current public x402 wrapper
- Authentication / required scope: x402 payment; no API-key/OAuth scope claimed
- Billing / price: Verified catalog price 0.005 USDC
- Headers: Accept application/json; POST also requires Content-Type application/json. x402 routes use payment challenge/proof headers. Candidate Authorization is TBD.
- Parameters and body: Query required url, absolute http/https, max 2048 chars. No body/path params. Unknown query fields currently ignored; null not representable.
- Idempotency: read-only evaluation. Repeats can return fresher evidence and may be separately billed. No storage-level idempotency is claimed; candidate Idempotency-Key requires approval.
- Time: query_time is SignGate completion; data_time is authoritative evidence time only when supplied; latency_ms measures request receipt to response completion.
- Evidence/mandate: optional opaque references only; never fabricate evidence_id or mandate authority.
- Security: SSRF/redirect protections are mandatory implementation concerns but are not asserted until verified.
