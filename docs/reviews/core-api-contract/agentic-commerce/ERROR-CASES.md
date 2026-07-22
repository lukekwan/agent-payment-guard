# Agentic Commerce Preflight: error cases

CONTRACT_STATUS=PROPOSED_CANDIDATE

## POST /v1/agentic-commerce/preflight

| Scenario | Class | Retry | Requirement |
|---|---:|---|---|
| Invalid input | 400/422 | No | Field-level details; candidate rejects unknown/null fields. |
| Authentication failure | 401/403 or x402 challenge | After correction | Current code unauthenticated; future auth/scope TBD |
| Billing failure | 402 | After valid payment | No verified billing entry or approved price |
| Evidence stale/unavailable | explicit limitation or 503 | Conditional | Never return fabricated low risk. |
| Rate limit | 429 | Yes | Honor Retry-After when present. |
| Upstream failure | 502/503 | Bounded | Preserve request_id; no provider secret leakage. |

```json
{"error":{"code":"EVIDENCE_UNAVAILABLE","message":"Required evidence is unavailable.","reason_codes":["SOURCE_UNAVAILABLE"],"details":[]},"meta":{"request_id":"req_sample_001","environment":"sample"}}
```

The error envelope is proposed only and does not replace current v1 errors.
