---
description: 在 execution 前 atomically consume 一個已驗證的 ALLOW。
---

# Consume ALLOW decision

Consume 會把一個 available、未過期、未使用的 `ALLOW` 轉為永久 consumed，並回傳 receipt。

{% hint style="info" %}
**Primary constraint:** 只有 valid consume receipt 才能授權執行同一個 bound action。
{% endhint %}

## Request

```json
{
  "contract_version": "0.1",
  "organization_id": "org_example",
  "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
  "policy_version": "deploy_policy_preview_01",
  "execution_attempt_id": "exec_preview_001"
}
```

## Response

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

## Retry 規則

相同 `execution_attempt_id` 可以安全 retry 並取得原始 receipt。不同 attempt、expired decision 或任何 binding mismatch 都會 fail closed。

## 執行

驗證 receipt 的 decision ID、organization、attempt ID、fingerprint 與 policy version 後，才執行完全相同的 bound action。
