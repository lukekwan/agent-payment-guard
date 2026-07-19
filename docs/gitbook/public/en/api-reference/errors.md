---
description: Map HTTP errors to fail-closed client behavior.
---

# Error responses

Errors do not carry a policy decision and never authorize execution.

{% hint style="info" %}
**Primary constraint:** Every non-successful response stops the action.
{% endhint %}

## Status codes

| Status | Meaning | Retry guidance |
| --- | --- | --- |
| `400` | Malformed JSON or UTF-8 | Fix request |
| `401` | Authentication failed | Fix credential |
| `403` | Scope, authorization, or tenant mismatch | Fix authorization |
| `409` | Idempotency, reuse, expiry, or consume conflict | Inspect reason; keep identifiers stable |
| `422` | Schema or contract invalid | Fix fields |
| `500` | Invariant or persistence failure | Retry safely or defer |
| `503` | Policy or dependency unavailable | Back off or defer |

## Error envelope

```json
{
  "contract_version": "0.1",
  "error": "SCHEMA_INVALID",
  "reason_codes": ["SCHEMA_INVALID"],
  "request_id": "req_preview_001",
  "enforcement_effect": "DENY",
  "audit_id": "audit_error_001"
}
```

## Client rule

Do not map a `500` or `503` to `DENY` as a policy conclusion. The enforcement effect is still non-execution, but no policy decision was produced.
