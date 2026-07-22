# Agentic Commerce Preflight: response schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## Current response example

```json
{
  "product": "agentic-commerce-preflight",
  "schema_version": "agentic_commerce_preflight_result.v1",
  "response_kind": "decision",
  "evaluator_version": "current",
  "decision": "REQUIRE_APPROVAL",
  "decision_id": "decision_sample_001",
  "evaluated_at": "2026-06-16T02:30:00Z",
  "expires_at": "2026-06-16T02:35:00Z",
  "policy_version": "current",
  "action": {}, "agent": {}, "buyer": {}, "mandate": null, "merchant": {}, "resource": {},
  "reason_codes": [], "evidence": [],
  "signer_directive": {"required": true, "mode": "hold_for_human_review", "agent_may_directly_sign": false},
  "decision_artifact": {},
  "recommended_next_action": "obtain_approval",
  "limitations": []
}
```

The values are a safe shape example. Runtime-computed IDs, versions, reasons, and nested objects remain service-specific.

## POST /v1/agentic-commerce/preflight

### Exact current behavior

Current object: product, schema_version, response_kind, evaluator_version, decision ALLOW|REQUIRE_APPROVAL|DENY, decision_id, evaluated_at, expires_at, policy_version, action, agent, buyer, mandate, merchant, resource, reason_codes, evidence, signer_directive, decision_artifact, recommended_next_action, limitations.

### Non-binding normalized presentation

```json
{"data":{"service_specific_fields":"preserved"},"meta":{"request_id":"req_sample_001","schema_version":"candidate-1.0","environment":"sample","query_time":"2026-06-16T02:30:00Z","latency_ms":182,"usage":{}}}
```

Omit data_time, evidence, and usage fields when the source does not provide them. request_id is correlation, not idempotency. Missing/stale evidence is explicit and never becomes low risk. Retry only timeout, 429, and transient 5xx with bounded backoff, Retry-After, and payment replay protection. Current rate-limit headers/SLA are not claimed.

### Breaking risk and migration

Wrapping this same v1 path is breaking. Preserve v1; if approved, introduce /v2, SDK adapters, dual-shape tests, a dated migration guide, and deprecation window.

## Candidate error schema

Required error.code, error.message, error.reason_codes, error.details, meta.request_id, and meta.environment. Unknown/null rules require owner approval before generated contracts.
