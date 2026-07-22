# Consume decision

```http
POST /v1/decisions/{decision_id}/consume
```

在 executor 開始 irreversible action 前，atomically consume 一個有效的 `ALLOW`。本 request 成功前，`ALLOW` 不可執行。

## Authentication

需要具有 `decision:consume` scope 的 bearer credential。

## Path parameter

| Name | Type | 必填 | 說明 |
| --- | --- | --- | --- |
| `decision_id` | string | 是 | 由 `POST /v1/decisions` 回傳，且必須符合 `^dec_[A-Za-z0-9_:-]+$`。 |

## Request body

| Field | Type | 必填 | 說明 |
| --- | --- | --- | --- |
| `contract_version` | string | 是 | 必須是 `0.1`。 |
| `organization_id` | string | 是 | 必須符合 credential 與 decision。 |
| `action_fingerprint` | string | 是 | Decision 回傳的完整 SHA-256 fingerprint。 |
| `policy_version` | string | 是 | Decision 回傳的完整 policy version。 |
| `execution_attempt_id` | string | 是 | 本次 execution attempt 使用的穩定 ID。 |

```json
{
  "contract_version": "0.1",
  "organization_id": "org_nomos_labs",
  "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
  "policy_version": "deploy_policy_2026_07_18_01",
  "execution_attempt_id": "exec_doc_001"
}
```

## `200` response

```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "receipt": {
    "consume_receipt_id": "rcpt_doc_001",
    "organization_id": "org_nomos_labs",
    "decision_id": "dec_doc_001",
    "execution_attempt_id": "exec_doc_001",
    "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
    "policy_version": "deploy_policy_2026_07_18_01",
    "executor_principal_id": "executor_preview_01",
    "consumed_at": "2026-07-19T12:02:00Z"
  }
}
```

相同 `execution_attempt_id` retry 時可以 replay 原始 receipt。Decision 已 consumption 後，使用不同 attempt 會以 `409` conflict semantics 失敗。Expired、非 `ALLOW`、unavailable、mismatched 或 already-used decision 一律 fail closed。
