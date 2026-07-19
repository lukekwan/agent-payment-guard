---
description: 在 execution 前 atomically consume 一個 verified ALLOW。
---

# Consume ALLOW decision

將 available、未過期、未使用的 `ALLOW` 轉換為 single-use consume receipt。

{% hint style="danger" %}
Consume 成功前不得開始 execution。
{% endhint %}

## Method 與 path

```http
POST /v1/decisions/{decision_id}/consume
```

## 互動式 API

{% openapi src="https://raw.githubusercontent.com/lukekwan/agent-payment-guard/ef29cbffe06703a64a8c095b30b0e0bd188930ae/docs/openapi/signgate-public-v0.1.openapi.json" path="/v1/decisions/{decision_id}/consume" method="post" %}

{% hint style="info" %}
Test it 面板只限授權的 preview environment。請替換 placeholder host 並提供 preview credential；目前不提供 production execution。
{% endhint %}

## Authentication

Bearer API key。必要 scope: `decision:consume`.

## Path parameter

| Parameter | Type | Required | 說明 |
| --- | --- | --- | --- |
| `decision_id` | string | Yes | 要 consume 的 ALLOW decision。 |

## Request body

| Field | Type | Required | 說明 |
| --- | --- | --- | --- |
| `contract_version` | string | Yes | Must be `0.1`. |
| `organization_id` | string | Yes | 必須符合 credential 與 decision。 |
| `action_fingerprint` | string | Yes | Executor 重新計算的 action fingerprint。 |
| `policy_version` | string | Yes | Create response 的 policy version。 |
| `execution_attempt_id` | string | Yes | 此 logical execution attempt 的 stable ID。 |

## Request example

```json
{
  "contract_version": "0.1",
  "organization_id": "org_example",
  "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
  "policy_version": "deploy_policy_preview_01",
  "execution_attempt_id": "exec_preview_001"
}
```

## Response states

{% tabs %}
{% tab title="第一次 consume 成功" %}
```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "receipt": {
    "consume_receipt_id": "rcpt_preview_001",
    "organization_id": "org_example",
    "decision_id": "dec_preview_001",
    "execution_attempt_id": "exec_preview_001",
    "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
    "policy_version": "deploy_policy_preview_01",
    "executor_principal_id": "executor_preview_01",
    "consumed_at": "2030-01-01T12:01:00Z"
  }
}
```
{% endtab %}

{% tab title="相同 attempt retry" %}
回傳與第一次成功 consume 完全相同的 receipt。

```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "receipt": {
    "consume_receipt_id": "rcpt_preview_001",
    "organization_id": "org_example",
    "decision_id": "dec_preview_001",
    "execution_attempt_id": "exec_preview_001",
    "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
    "policy_version": "deploy_policy_preview_01",
    "executor_principal_id": "executor_preview_01",
    "consumed_at": "2030-01-01T12:01:00Z"
  }
}
```
{% endtab %}

{% tab title="已被 consume" %}
```json
{
  "contract_version": "0.1",
  "error": "DECISION_ALREADY_CONSUMED",
  "reason_codes": ["DECISION_ALREADY_CONSUMED"],
  "enforcement_effect": "DENY"
}
```
{% endtab %}

{% tab title="已過期" %}
```json
{
  "contract_version": "0.1",
  "error": "DECISION_EXPIRED",
  "reason_codes": ["DECISION_EXPIRED"],
  "enforcement_effect": "DENY"
}
```
{% endtab %}

{% tab title="Fingerprint mismatch" %}
```json
{
  "contract_version": "0.1",
  "error": "DECISION_NOT_CONSUMABLE",
  "reason_codes": ["DECISION_NOT_CONSUMABLE"],
  "enforcement_effect": "DENY"
}
```
{% endtab %}
{% endtabs %}

## Decision semantics

只有 `ALLOW`、available、未過期、organization-bound、fingerprint-bound、policy-bound 且未使用的 decision 才能 consume。

## Error responses

`400`, `401`, `403`, `409`, `422`, `500`, and `503` all mean **不得執行**. 詳細內容請見 [Error responses](errors.md).

## Retry 與 idempotency

只有相同 decision 與相同 `execution_attempt_id` 的 identical retry 才能安全恢復原始 receipt。不同 attempt 不得接管已 consumed decision。

## Security notes

- Consume 前重新計算 fingerprint。
- 驗證 receipt 與 request 的所有 binding fields。
- Downstream failure 不會讓 decision 恢復 available。

## Related guides

- [只有 consume 後才執行](../guides/safe-execution.md)
- [安全 retry](../guides/retries.md)
- [處理 downstream execution failure](../guides/downstream-failure.md)
