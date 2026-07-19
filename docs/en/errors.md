# Error handling

Only HTTP `200` responses contain the policy `decision` enum. Error responses never contain `decision` and always fail closed.

| Status | Meaning | Typical action |
| --- | --- | --- |
| `400` | Malformed JSON or invalid UTF-8 | Fix serialization and retry with a new valid body. |
| `401` | Authentication failed | Check the bearer credential. |
| `403` | Wrong scope, tenant mismatch, or authorization failure | Check credential scope and organization binding. |
| `409` | Request ID or consume conflict | Inspect idempotency and execution-attempt identifiers. |
| `422` | Schema or contract validation failed | Correct fields against the OpenAPI schema. |
| `500` | Invariant or persistence failure | Do not execute; retry only according to integration policy. |
| `503` | Policy or dependency unavailable | Do not execute; retry with backoff. |

## Error body

```json
{
  "contract_version": "0.1",
  "error": "schema_invalid",
  "reason_codes": ["REQUEST_SCHEMA_INVALID"],
  "request_id": "req_example_001",
  "enforcement_effect": "DENY",
  "audit_id": "audit_example_001"
}
```

`500` and `503` never mint an `ALLOW` artifact and must not be interpreted or audited as a policy `DENY` decision.
