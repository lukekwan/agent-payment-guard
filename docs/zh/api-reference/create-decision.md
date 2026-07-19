# 建立 decision

```http
POST /v1/decisions
```

評估一個完整的 `deploy_change` action。HTTP `200` 只代表 evaluation 已完成，不代表已授權執行。

## Authentication

需要具有 `decision:create` scope 的 bearer credential。請參閱[驗證與授權](../authentication.md)。

## Request body

| Field | Type | 必填 | 說明 |
| --- | --- | --- | --- |
| `contract_version` | string | 是 | 必須是 `0.1`。 |
| `request_id` | string | 是 | Organization-scoped idempotency key。 |
| `organization_id` | string | 是 | 必須符合 authenticated organization。 |
| `agent` | object | 是 | Authenticated coding-agent identity。 |
| `action` | object | 是 | 完整的 `deploy_change` target 與 parameters。 |
| `intent` | string | 否 | 僅供描述，不能覆蓋 policy。 |
| `mandate` | object | 是 | Mandate ID、scope、issuer 與 expiry。 |
| `evidence` | array | 是 | 1 至 128 筆 evidence record。 |
| `context` | object | 否 | Optional request timestamp context。 |

Action 必須包含 repository identity、target environment 與 service、綁定 commit 的 CI evidence、changed paths 與 routes、protected-surface flags、deployment command，以及 configuration fingerprint。未知欄位會被拒絕。

完整且可執行的 request 可參考 [curl create-decision 範例](../../examples/curl/create-decision.sh)，schema 細節以 [public OpenAPI](../../openapi/signgate-public-v0.1.openapi.json) 為準。

## `200` response

Response 包含 decision、identifier、完整 `bound_action`、fingerprint、policy version、issued/expiry time、reason code、approval requirement、execution directive 與 audit ID。

```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "decision": "ALLOW",
  "decision_id": "dec_doc_001",
  "request_id": "req_doc_preview_001",
  "organization_id": "org_nomos_labs",
  "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
  "policy_version": "deploy_policy_2026_07_18_01",
  "issued_at": "2026-07-19T12:01:00Z",
  "expires_at": "2026-07-19T12:16:00Z",
  "reason_codes": ["PREVIEW_DEPLOY_POLICY_PASSED"],
  "required_checks": [],
  "approval": {"required": false},
  "execution_directive": {
    "action": "EXECUTE",
    "max_uses": 1,
    "replay_protection": "SERVICE_CONSUME_REQUIRED"
  },
  "audit_id": "audit_doc_001"
}
```

上方為精簡範例，canonical response 另含 `bound_action`。繼續前必須核對它與預計執行的 action 完全相符。

## Outcomes

- `ALLOW`：在執行前呼叫 [Consume decision](consume-decision.md)。
- `REQUIRE_APPROVAL`：不得執行；取得 trusted approval 後送出全新 request。
- `DENY`：不得執行。

可能的 error status 為 `400`、`401`、`403`、`409`、`422`、`500`、`503`。請參閱[錯誤處理](../errors.md)。
