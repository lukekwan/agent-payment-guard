# 錯誤處理

只有 HTTP `200` response 會包含 policy `decision` enum。Error response 絕不包含 `decision`，並一律 fail closed。

| Status | 意義 | 建議處理 |
| --- | --- | --- |
| `400` | Malformed JSON 或 invalid UTF-8 | 修正 serialization 後再送出有效 body。 |
| `401` | Authentication failed | 檢查 bearer credential。 |
| `403` | Scope 錯誤、tenant mismatch 或 authorization failure | 檢查 credential scope 與 organization binding。 |
| `409` | Request ID 或 consume conflict | 檢查 idempotency 與 execution-attempt identifier。 |
| `422` | Schema 或 contract validation failed | 依 OpenAPI schema 修正欄位。 |
| `500` | Invariant 或 persistence failure | 不得執行；只依 integration policy retry。 |
| `503` | Policy 或 dependency unavailable | 不得執行；使用 backoff retry。 |

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

`500` 與 `503` 不會產生 `ALLOW` artifact，也不得被解讀或 audit 成 policy `DENY` decision。
