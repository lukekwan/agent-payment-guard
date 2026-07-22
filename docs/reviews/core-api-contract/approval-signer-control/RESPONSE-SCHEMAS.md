# Approval & Signer Control: response schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## Current-response status

There is no verified current production response at this candidate path. The only authoritative comparison is the signer_directive nested in the current Agentic Commerce response. A fabricated standalone current JSON example is therefore intentionally not provided.

## POST /v1/approval-signer/evaluate

### Exact current behavior

No current response at this path. Existing Agentic Commerce response contains signer_directive evidence but does not prove this endpoint.

### Non-binding normalized presentation

```json
{"data":{"service_specific_fields":"preserved"},"meta":{"request_id":"req_sample_001","schema_version":"candidate-1.0","environment":"sample","query_time":"2026-06-16T02:30:00Z","latency_ms":182,"usage":{}}}
```

Omit data_time, evidence, and usage fields when the source does not provide them. request_id is correlation, not idempotency. Missing/stale evidence is explicit and never becomes low risk. Retry only timeout, 429, and transient 5xx with bounded backoff, Retry-After, and payment replay protection. Current rate-limit headers/SLA are not claimed.

### Breaking risk and migration

Wrapping this same v1 path is breaking. Preserve v1; if approved, introduce /v2, SDK adapters, dual-shape tests, a dated migration guide, and deprecation window.

## Candidate error schema

Required error.code, error.message, error.reason_codes, error.details, meta.request_id, and meta.environment. Unknown/null rules require owner approval before generated contracts.
