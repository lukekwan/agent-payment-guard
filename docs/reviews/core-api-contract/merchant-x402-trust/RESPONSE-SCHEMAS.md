# Merchant & x402 Trust: response schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## Current response examples

```json
{"product":"base-merchant-trust","schema_version":"current","address":"0x1111111111111111111111111111111111111111","limitations":[]}
```

```json
{"product":"x402-endpoint-preflight","schema_version":"current","url":"https://merchant.example/.well-known/x402","limitations":[]}
```

These examples show only verified top-level identity/input boundaries. The builders return additional service-specific fields; they are not restated without a captured authoritative payload.

## GET /v1/x402/base/merchant-trust

### Exact current behavior

Current merchantTrust service object, not normalized envelope.

### Non-binding normalized presentation

```json
{"data":{"service_specific_fields":"preserved"},"meta":{"request_id":"req_sample_001","schema_version":"candidate-1.0","environment":"sample","query_time":"2026-06-16T02:30:00Z","latency_ms":182,"usage":{}}}
```

Omit data_time, evidence, and usage fields when the source does not provide them. request_id is correlation, not idempotency. Missing/stale evidence is explicit and never becomes low risk. Retry only timeout, 429, and transient 5xx with bounded backoff, Retry-After, and payment replay protection. Current rate-limit headers/SLA are not claimed.

### Breaking risk and migration

Wrapping this same v1 path is breaking. Preserve v1; if approved, introduce /v2, SDK adapters, dual-shape tests, a dated migration guide, and deprecation window.

## GET /v1/x402/web/endpoint-preflight

### Exact current behavior

Current buildX402EndpointPreflight service object, not normalized envelope.

### Non-binding normalized presentation

```json
{"data":{"service_specific_fields":"preserved"},"meta":{"request_id":"req_sample_001","schema_version":"candidate-1.0","environment":"sample","query_time":"2026-06-16T02:30:00Z","latency_ms":182,"usage":{}}}
```

Omit data_time, evidence, and usage fields when the source does not provide them. request_id is correlation, not idempotency. Missing/stale evidence is explicit and never becomes low risk. Retry only timeout, 429, and transient 5xx with bounded backoff, Retry-After, and payment replay protection. Current rate-limit headers/SLA are not claimed.

### Breaking risk and migration

Wrapping this same v1 path is breaking. Preserve v1; if approved, introduce /v2, SDK adapters, dual-shape tests, a dated migration guide, and deprecation window.

## Candidate error schema

Required error.code, error.message, error.reason_codes, error.details, meta.request_id, and meta.environment. Unknown/null rules require owner approval before generated contracts.
