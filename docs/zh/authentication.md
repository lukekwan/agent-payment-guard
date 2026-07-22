# 驗證與授權

SignGate preview 使用 bearer API key。每個 request 都必須帶入：

```http
Authorization: Bearer <preview-api-key>
```

Credential 會綁定 organization、principal identity、principal type、scope、status、digest version 與 credential prefix。Raw key 不得存入 D1、提交至 repository 或寫入 log。

## 必要 scope

| 操作 | Scope |
| --- | --- |
| 建立 decision | `decision:create` |
| Consume `ALLOW` | `decision:consume` |

評估用 agent 與 executor 應使用分離且符合 least privilege 的 credential。範例會從 `SIGNGATE_AGENT_KEY` 與 `SIGNGATE_EXECUTOR_KEY` 環境變數讀取 credential。

## Organization 綁定

Request body 的 `organization_id` 為必填，且必須完全符合 authenticated credential 的 organization。Cross-tenant failure 會回傳不洩漏資源存在與否的 authorization error。

## Preview base URL

```text
https://preview.signgate.local
```

這是 preview placeholder。請只使用授權 integration 提供的 preview host。DOC-SG-001 不授權任何 production base URL。

下一步：[Decision 生命週期](decision-lifecycle.md)
