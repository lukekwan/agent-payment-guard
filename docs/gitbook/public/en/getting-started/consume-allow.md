---
description: Atomically consume a verified ALLOW immediately before execution.
---

# Consume an ALLOW decision

Consume permanently transitions one available, unexpired, unused `ALLOW` and returns a receipt.

{% hint style="info" %}
**Primary constraint:** Only a valid consume receipt authorizes the same bound action to execute.
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

## Retry rules

The same `execution_attempt_id` can be retried safely to recover the original receipt. A different attempt, expired decision, or binding mismatch fails closed.

## Execute

Verify the receipt's decision ID, organization, attempt ID, fingerprint, and policy version before executing the exact bound action.
