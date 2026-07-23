---
description: Atomically consume a verified ALLOW before execution.
---

# Consume an ALLOW decision

Convert one available, unexpired, unused `ALLOW` into a single-use consume receipt.

{% hint style="danger" %}
Do not begin execution before consume succeeds.
{% endhint %}

## Method and path

```http
POST /v1/decisions/{decision_id}/consume
```

## Interactive API

{% openapi src="https://raw.githubusercontent.com/lukekwan/agent-payment-guard/docs/doc-sg-001-api-docs/docs/gitbook/public/openapi/signgate-public-v0.1.openapi.json" path="/v1/decisions/{decision_id}/consume" method="post" %}

{% hint style="info" %}
The Test it panel is for an authorized preview environment only. Replace the placeholder host and provide a preview credential; production execution is unavailable.
{% endhint %}

## Authentication

Bearer API key. Required scope: `decision:consume`.

## Path parameter

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `decision_id` | string | Yes | The ALLOW decision to consume. |

## Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `contract_version` | string | Yes | Must be `0.1`. |
| `organization_id` | string | Yes | Must match the credential and decision. |
| `action_fingerprint` | string | Yes | Action fingerprint recomputed by the executor. |
| `policy_version` | string | Yes | Policy version from the create response. |
| `execution_attempt_id` | string | Yes | Stable ID for this logical execution attempt. |

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
{% tab title="First successful consume" %}
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

{% tab title="Same-attempt retry" %}
Returns the same receipt as the first successful consume.

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

{% tab title="Already consumed" %}
```json
{
  "contract_version": "0.1",
  "error": "DECISION_ALREADY_CONSUMED",
  "reason_codes": ["DECISION_ALREADY_CONSUMED"],
  "enforcement_effect": "DENY"
}
```
{% endtab %}

{% tab title="Expired" %}
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

The decision must be `ALLOW`, available, unexpired, organization-bound, fingerprint-bound, policy-bound, and unused.

## Error responses

`400`, `401`, `403`, `409`, `422`, `500`, and `503` all mean **do not execute**. See [Error responses](errors.md).

## Retry and idempotency

Only an identical retry with the same decision and `execution_attempt_id` can safely recover the original receipt. A different attempt cannot take over a consumed decision.

## Security notes

- Recompute the fingerprint before consume.
- Verify every receipt binding field against the request.
- A downstream failure does not make the decision available again.

## Related guides

- [Execute only after consume](../guides/safe-execution.md)
- [Retry safely](../guides/retries.md)
- [Handle downstream execution failure](../guides/downstream-failure.md)
