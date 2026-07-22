---
description: 將 HTTP errors 映射成 fail-closed client behavior。
---

# Error responses

Errors 不包含 policy decision，永遠不能授權 execution。

{% hint style="info" %}
**Primary constraint:** 任何 unsuccessful response 都必須停止 action。
{% endhint %}

## Status codes

| Status | 意義 | Retry guidance |
| --- | --- | --- |
| `400` | Malformed JSON 或 UTF-8 | 修正 request |
| `401` | Authentication failed | 修正 credential |
| `403` | Scope、authorization 或 tenant mismatch | 修正 authorization |
| `409` | Idempotency、reuse、expiry 或 consume conflict | 檢查 reason 並保持 identifiers |
| `422` | Schema 或 contract invalid | 修正 fields |
| `500` | Invariant 或 persistence failure | 安全 retry 或 defer |
| `503` | Policy 或 dependency unavailable | Back off 或 defer |

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

不要把 `500` 或 `503` 當成 policy `DENY`；enforcement effect 仍是 non-execution，但沒有產生 policy decision。
