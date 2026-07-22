# Risk Source API: response schemas

CONTRACT_STATUS=PROPOSED_CANDIDATE

## Current verified wrapper example

```json
{
  "product": "bcs-address-risk",
  "schema_version": "1.0",
  "network": "base-mainnet",
  "upstream_service": "blockchainsecurity-atlantis",
  "request": {"blockchain": "ethereum", "address": "0x1111111111111111111111111111111111111111"},
  "fetched_at": "2026-06-16T02:30:00Z",
  "upstream_status": 200,
  "upstream_headers": {"request_id": null, "credit_cost": null, "credit_remaining": null},
  "upstream_response": {},
  "provenance": {"upstream_base_url": "https://api.blockchainsecurity.asia", "upstream_path": "/address-risk", "upstream_method": "POST", "auth_model": "server-side X-API-Key secret"},
  "limitations": []
}
```

The opaque upstream_response is intentionally empty in this safe example: no captured authoritative payload was available, so risk fields are not invented.

## Candidate Address Risk field semantics

| Field | Candidate meaning | Current verified behavior |
|---|---|---|
| risk_score | 0.0–10.0 only after an approved source mapping | No normalized field; may exist only inside opaque upstream_response |
| risk_level | LOW 0–2.9; MODERATE 3–5.9; HIGH 6–7.9; SEVERE 8–10 | Not normalized |
| source_reliability | Proposed two-part source/assessment code such as B2; taxonomy and authority are approval-blocked | Not supplied as a normalized field |
| address_type / entity_type | Versioned normalized classifications when source values are mappable | Current classify route is separate; no verified cross-route normalization |
| local_risk_signal | True only when a SignGate-owned, versioned local rule fired | Not supplied |
| matched_rules | Approved SignGate rule IDs only; upstream labels stay upstream labels | Not supplied |
| behavioral_patterns | Values from a versioned taxonomy; unknown labels are not translated | No verified normalized taxonomy |
| multi_hop_exposure | Detection limited to requested max_hops and observed graph | Trace route is separate and returns opaque upstream data |
| evidence_id | Optional retrievable artifact ID under an approved retention policy | No verified local evidence artifact ID |
| query_time | SignGate response completion time | Current fetched_at is closest but is not renamed |
| data_time | Newest authoritative evidence timestamp | Not guaranteed by current wrapper |
| latency_ms | Request receipt to normalized response completion | Not measured in current wrapper |

## POST /v1/risk-source/address-risk

### Exact current behavior

No current response at this path. Current BCS routes return product/schema_version/network/upstream_status/upstream_headers/upstream_response/provenance/limitations.

### Non-binding normalized presentation

```json
{"data":{"service_specific_fields":"preserved"},"meta":{"request_id":"req_sample_001","schema_version":"candidate-1.0","environment":"sample","query_time":"2026-06-16T02:30:00Z","latency_ms":182,"usage":{}}}
```

Omit data_time, evidence, and usage fields when the source does not provide them. request_id is correlation, not idempotency. Missing/stale evidence is explicit and never becomes low risk. Retry only timeout, 429, and transient 5xx with bounded backoff, Retry-After, and payment replay protection. Current rate-limit headers/SLA are not claimed.

### Breaking risk and migration

Wrapping this same v1 path is breaking. Preserve v1; if approved, introduce /v2, SDK adapters, dual-shape tests, a dated migration guide, and deprecation window.

## Candidate error schema

Required error.code, error.message, error.reason_codes, error.details, meta.request_id, and meta.environment. Unknown/null rules require owner approval before generated contracts.
