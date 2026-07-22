# Merchant & x402 Trust: error cases

CONTRACT_STATUS=PROPOSED_CANDIDATE

## GET /v1/x402/base/merchant-trust

| Scenario | Class | Retry | Requirement |
|---|---:|---|---|
| Invalid input | 400/422 | No | Field-level details; candidate rejects unknown/null fields. |
| Authentication failure | 401/403 or x402 challenge | After correction | x402 payment; no API-key/OAuth scope claimed |
| Billing failure | 402 | After valid payment | Verified catalog price 0.03 USDC |
| Evidence stale/unavailable | explicit limitation or 503 | Conditional | Never return fabricated low risk. |
| Rate limit | 429 | Yes | Honor Retry-After when present. |
| Upstream failure | 502/503 | Bounded | Preserve request_id; no provider secret leakage. |

```json
{"error":{"code":"EVIDENCE_UNAVAILABLE","message":"Required evidence is unavailable.","reason_codes":["SOURCE_UNAVAILABLE"],"details":[]},"meta":{"request_id":"req_sample_001","environment":"sample"}}
```

The error envelope is proposed only and does not replace current v1 errors.

## GET /v1/x402/web/endpoint-preflight

| Scenario | Class | Retry | Requirement |
|---|---:|---|---|
| Invalid input | 400/422 | No | Field-level details; candidate rejects unknown/null fields. |
| Authentication failure | 401/403 or x402 challenge | After correction | x402 payment; no API-key/OAuth scope claimed |
| Billing failure | 402 | After valid payment | Verified catalog price 0.005 USDC |
| Evidence stale/unavailable | explicit limitation or 503 | Conditional | Never return fabricated low risk. |
| Rate limit | 429 | Yes | Honor Retry-After when present. |
| Upstream failure | 502/503 | Bounded | Preserve request_id; no provider secret leakage. |

```json
{"error":{"code":"EVIDENCE_UNAVAILABLE","message":"Required evidence is unavailable.","reason_codes":["SOURCE_UNAVAILABLE"],"details":[]},"meta":{"request_id":"req_sample_001","environment":"sample"}}
```

The error envelope is proposed only and does not replace current v1 errors.
