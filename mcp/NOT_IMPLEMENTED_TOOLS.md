# Conditional MCP Tools Not Mounted In v1

These are product specifications only. They are not mounted in `tools/list` and
must not be presented as production-ready MCP tools.

## audit_seller

Status: `NOT_IMPLEMENTED`

Reason: SignGate has related evidence endpoints, including merchant trust and
x402 origin due-diligence, but no dedicated Seller Decision Packet backend
contract that returns a single seller payment decision.

Proposed input:

```json
{
  "seller_identifier": "seller-123",
  "wallet_address": "0x1111111111111111111111111111111111111111",
  "domain": "api.seller.example",
  "resource_url": "https://api.seller.example/v1/x402/report",
  "network": "base",
  "asset": "USDC",
  "requested_amount": "0.025"
}
```

Required backend capabilities before mounting:

- seller identity resolution
- domain and wallet consistency checks
- sanctions/risk exposure aggregation
- evidence references with provenance
- decision confidence
- legal/product boundary for seller risk decisions
- signed decision receipt dependency if the output claims receipt support

## verify_decision_receipt

Status: `NOT_IMPLEMENTED`

Reason: Current public SignGate responses are Decision Responses. The signed
Decision Artifact / receipt system is still a design draft.

Required schema fields:

- `decision_id`
- `policy_version`
- `request_hash`
- `decision`
- `reason_code_hash`
- `evidence_hash`
- `issued_at`
- `expires_at`
- `issuer`
- `signature_algorithm`
- `key_id`
- `signature`

Required implementation tasks:

1. Receipt schema specification.
2. Canonicalization and digest implementation.
3. Signing implementation.
4. Public key discovery endpoint.
5. Verification endpoint: `/v1/receipts/verify`.
6. Offline verification specification.
7. Key rotation policy.
8. Revoked key handling.
9. Replay protection.
10. MCP tool wrapper.

The MCP tool must not be mounted until these exist and have tests.
