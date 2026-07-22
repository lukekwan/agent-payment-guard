# Response envelope revision

**Status:** non-binding presentation proposal only.
**Runtime changed:** no.
**OpenAPI changed:** no.

This document proposes a future versioned normalization boundary. It does not redefine current service responses and must not be substituted into existing endpoint examples as if already deployed.

## Exact current response example

Captured from the public, free `GET /v1/agentic-commerce/preflight/sample` endpoint on 2026-07-22. The endpoint is a safe sample, not a sandbox. IDs and timestamps may vary between calls.

```json
{
  "product": "agentic-commerce-preflight",
  "schema_version": "agentic_commerce_preflight_result.v1",
  "response_kind": "decision_response",
  "evaluator_version": "signgate-agentic-commerce-evaluator.0.1.0",
  "decision": "REQUIRE_APPROVAL",
  "decision_id": "dec_71946231",
  "evaluated_at": "2026-07-22T08:51:16.396Z",
  "expires_at": "2026-07-22T08:56:16.396Z",
  "policy_version": "signgate-agentic-commerce-policy-2026-07-15",
  "action": "payment_execution",
  "agent": { "id": "agent.finance.001", "role": "finance_agent" },
  "buyer": { "id": "buyer.acme" },
  "mandate": { "id": "mandate-001", "type": "payment", "status": "active" },
  "merchant": {
    "domain": "pay.vendor.example",
    "wallet": "0xabc0000000000000000000000000000000000001",
    "category": "payment_execution",
    "kyt_risk": "low"
  },
  "resource": {
    "category": "payment_execution",
    "amount_usdc": 0.25,
    "asset": "USDC",
    "chain": "base"
  },
  "reason_codes": [
    "ROLE_PRODUCT_CATEGORY_APPROVAL_REQUIRED",
    "PAYMENT_EXECUTION_REQUIRES_APPROVAL",
    "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"
  ],
  "evidence": [
    {
      "type": "agent_buyer_identity",
      "source": "signgate",
      "decision": "APPROVAL_REQUIRED",
      "role_product_fit": "needs_owner_review"
    },
    {
      "type": "mandate",
      "id": "mandate-001",
      "mandate_type": "payment",
      "status": "active",
      "expires_at": "2099-01-01T00:00:00.000Z"
    },
    {
      "type": "merchant_trust",
      "domain": "pay.vendor.example",
      "wallet": "0xabc0000000000000000000000000000000000001",
      "expected_wallet": "0xabc0000000000000000000000000000000000001",
      "openapi_domain": "pay.vendor.example",
      "agent_card_domain": "pay.vendor.example",
      "category": "payment_execution",
      "kyt_risk": "low"
    }
  ],
  "signer_directive": {
    "required": true,
    "mode": "human_fido2_or_controlled_signer",
    "agent_may_directly_sign": false,
    "execution_may_be_agent_initiated": true,
    "signer_isolation_required": true,
    "required_signer": {
      "mode": "out_of_agent",
      "allowed_classes": ["human_fido2", "hsm", "kms", "custody", "smart_account_module"]
    },
    "reason_code": "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"
  },
  "decision_artifact": {
    "issued": false,
    "status": "not_cryptographically_signed",
    "note": "Decision Artifact is a future signed object with request, policy, mandate, and evidence digests."
  },
  "recommended_next_action": "request_owner_policy_or_signer_approval",
  "limitations": [
    "This demo endpoint is deterministic and does not verify live AP2, x402, KYT, or chain state.",
    "SignGate does not custody funds, hold private keys, sign transactions, or move money.",
    "Production use should bind decisions to authenticated agents, immutable policy versions, nonce, expiry, and signer verification."
  ]
}
```

The current response has no `request_id` and no billing receipt. Documentation must not invent either. The visual sample may label a clearly synthetic request ID only if it says it is illustrative; the canonical captured payload must remain exact.

## Proposed normalized success presentation

This example copies the current service payload under `data`. `environment=sample` and free/no-charge usage are derived from the explicitly free sample endpoint. `request_id` is omitted because the source did not provide one.

```json
{
  "data": {
    "product": "agentic-commerce-preflight",
    "schema_version": "agentic_commerce_preflight_result.v1",
    "response_kind": "decision_response",
    "decision": "REQUIRE_APPROVAL",
    "decision_id": "dec_71946231",
    "evaluated_at": "2026-07-22T08:51:16.396Z",
    "expires_at": "2026-07-22T08:56:16.396Z",
    "reason_codes": [
      "ROLE_PRODUCT_CATEGORY_APPROVAL_REQUIRED",
      "PAYMENT_EXECUTION_REQUIRES_APPROVAL",
      "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"
    ],
    "signer_directive": {
      "required": true,
      "agent_may_directly_sign": false,
      "reason_code": "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"
    }
  },
  "meta": {
    "environment": "sample",
    "evaluated_at": "2026-07-22T08:51:16.396Z",
    "expires_at": "2026-07-22T08:56:16.396Z",
    "usage": {
      "billing_mode": "free",
      "charge_basis": "not_applicable",
      "charged": false
    }
  }
}
```

## Proposed normalized error presentation

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "One or more request fields are invalid.",
    "reason_codes": ["MISSING_MANDATE"]
  },
  "meta": {
    "request_id": "req_authoritative_from_runtime",
    "environment": "sandbox",
    "usage": {
      "billing_mode": "credit",
      "charge_basis": "success_only",
      "charged": false,
      "units_charged": 0
    }
  }
}
```

All values in that error example are proposal placeholders. Production documentation may use them only after a real versioned contract emits them.

## Usage metadata model

| Field | Required when | Meaning / omission rule |
|---|---|---|
| `billing_mode` | `usage` is emitted | `free`, `credit`, `x402`, `subscription`, or `internal`. |
| `charge_basis` | Authoritative billing semantics exist | `not_applicable`, `per_request`, `success_only`, `subscription_included`, or `internal`. |
| `charged` | The billing layer can authoritatively determine charge state | Boolean; never infer from HTTP status alone. |
| `units_charged` | Credit/unit ledger returns it | Numeric units charged for this operation. Zero may be emitted only when authoritative. |
| `remaining_units` | Ledger returns a post-request balance | Omit when unavailable; never calculate from documentation prices. |
| `x402.amount` | x402 receipt/challenge provides it | Decimal string to avoid floating-point loss. |
| `x402.currency` | x402 receipt/challenge provides it | Exact asset/currency symbol or identifier. |
| `x402.network` | x402 receipt/challenge provides it | Exact authoritative network identifier. |

Examples by mode:

- **free:** `billing_mode=free`; `charged=false` only when the endpoint contract guarantees it.
- **credit:** emit charged/remaining units only from the credit ledger.
- **x402:** emit amount/currency/network only from the authoritative challenge or receipt; do not reconstruct them from the catalog.
- **subscription:** use `subscription` and `subscription_included` when known; omit fake per-request amounts and balances.
- **internal:** state `internal` only when the runtime classifies the caller/operation that way; do not expose confidential cost allocation.
- **success-only charging:** `charge_basis=success_only`; `charged` must reflect the billing transaction, not merely the application result.

If a source service provides no billing metadata, omit `usage` entirely. A visually consistent schema is not permission to fabricate fields.

## Compatibility and migration warning

Wrapping existing top-level fields under `data` is breaking for JSONPath expressions, destructuring, generated clients, schemas, response signatures, caches, MCP adapters, webhooks, and stored fixtures. Adding `meta` to existing responses may also break strict schemas and hashes.

Recommended migration path:

1. Keep all `/v1` responses unchanged and document them exactly.
2. Define a reviewed, versioned JSON Schema for the envelope and service payload mapping.
3. Implement the envelope only in a separately approved `/v2` API or explicit version negotiation boundary.
4. Release `/v2` SDK methods/types alongside `/v1`; do not silently remap existing methods.
5. Offer a migration guide with field mapping, dual-read examples, billing-field provenance, and contract tests.
6. Run both versions during a published migration window before any `/v1` deprecation.

## SDK impact

- New response types become `Success<TData, TUsage>` and `Error<TError, TUsage>`; existing `/v1` types remain stable.
- SDKs must model optional usage fields and discriminate billing modes.
- x402 amounts should use strings/decimal types, not binary floating point.
- SDKs must not treat HTTP 2xx, `charged=false`, or any global decision label as execution authority.
- MCP/tool adapters need explicit `/v1` and `/v2` mappings and fail closed on unknown envelopes.

`V2_RECOMMENDATION=separate_versioned_contract_after_PM_REVIEW`
`RUNTIME_CHANGE_AUTHORIZED=false`
`OPENAPI_CHANGE_AUTHORIZED=false`
