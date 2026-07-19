---
description: 對 Preview execution environment 的 request 進行驗證。
---

# 驗證

所有 public request 都使用與單一 organization 及 scopes 綁定的 bearer API key。

{% hint style="info" %}
**Primary constraint:** 不得將 raw API key 寫入 source code、log、截圖或支援訊息。
{% endhint %}

## Authorization header

```http
Authorization: Bearer <SIGNGATE_API_KEY>
```

## 環境變數

```bash
export SIGNGATE_BASE_URL="https://preview.example.signgate"
export SIGNGATE_API_KEY="<preview-api-key>"
```

## 必要 scopes

| 操作 | Scope |
| --- | --- |
| 建立 decision | `decision:create` |
| Consume `ALLOW` | `decision:consume` |

## Organization binding

Request 的 `organization_id` 必須符合 credential 所屬 organization。Tenant mismatch 會被拒絕，且不揭露其他 tenant 的 resource 是否存在。

## 下一步

[建立第一個 decision](first-decision.md)。
