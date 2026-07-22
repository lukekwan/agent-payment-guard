# API 參考

Public preview API 包含兩個 endpoint：

| Method | Endpoint | 必要 scope |
| --- | --- | --- |
| `POST` | [`/v1/decisions`](create-decision.md) | `decision:create` |
| `POST` | [`/v1/decisions/{decision_id}/consume`](consume-decision.md) | `decision:consume` |

所有 request 與 response body 都使用 `application/json`。Canonical machine-readable contract 是 [public OpenAPI 3.1 specification](../../openapi/signgate-public-v0.1.openapi.json)。

Internal Founder dogfood endpoint 不是 public product API，因此不會出現在這些頁面或 GitBook 導覽中。
