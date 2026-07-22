# Agent Payment Control: response schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## Current response example

```json
{
  "product": "agent-payment-risk-gateway",
  "schema_version": "0.1",
  "evaluated_at": "2026-06-16T02:30:00Z",
  "decision": "allow",
  "signing_directive": "sign_with_policy_controlled_key",
  "authorization_token": null,
  "max_allowed_amount_usdc": "0.10",
  "intent": {"request_id": "req_sample_001", "agent_id": "agent_demo", "purpose": "api_purchase", "pay_to": "0x1111111111111111111111111111111111111111", "amount_usdc": "0.025", "nonce": "nonce_demo_001"},
  "policy": {},
  "risk": {"score": 5, "level": "low", "labels": [], "source": "request"},
  "reasons": [],
  "next_action": "continue_with_policy_controlled_signer",
  "limitations": []
}
```

Optional current fields are omitted in the safe example; no normalized meta or billing usage object is claimed.

## GET /v1/x402/agent/payment-risk-gateway

### Exact current behavior

Current object: product, schema_version, evaluated_at, decision allow|review|deny, signing_directive, authorization_token, max_allowed_amount_usdc, intent, policy, risk, reasons, next_action, limitations.

### Non-binding normalized presentation

```json
{"data":{"service_specific_fields":"preserved"},"meta":{"request_id":"req_sample_001","schema_version":"candidate-1.0","environment":"sample","query_time":"2026-06-16T02:30:00Z","latency_ms":182,"usage":{}}}
```

Omit data_time, evidence, and usage fields when the source does not provide them. request_id is correlation, not idempotency. Missing/stale evidence is explicit and never becomes low risk. Retry only timeout, 429, and transient 5xx with bounded backoff, Retry-After, and payment replay protection. Current rate-limit headers/SLA are not claimed.

### Breaking risk and migration

Wrapping this same v1 path is breaking. Preserve v1; if approved, introduce /v2, SDK adapters, dual-shape tests, a dated migration guide, and deprecation window.

## Candidate error schema

Required error.code, error.message, error.reason_codes, error.details, meta.request_id, and meta.environment. Unknown/null rules require owner approval before generated contracts.
