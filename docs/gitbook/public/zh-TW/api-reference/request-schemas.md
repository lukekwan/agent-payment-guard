---
description: 了解 decision 與 consume operations 傳送的 fields。
---

# Request schemas

Request schemas 會嚴格綁定 authentication context、完整 action、authority、evidence 與 execution attempt identifiers。

{% hint style="info" %}
**Primary constraint:** 不得省略或近似描述 execution-relevant fields。
{% endhint %}

## DecisionRequest

| Object | 重要 fields |
| --- | --- |
| Root | `contract_version`, `request_id`, `organization_id` |
| Agent | `id`, `type`, `authenticated_by` |
| Action target | `environment`, `service`, `repository` |
| Action parameters | commit、digests、paths、routes、protected flags、strategy、command、configuration fingerprint、CI evidence |
| Mandate | `id`, `scope`, `issued_by`, `expires_at` |
| Evidence | `id`, `type`, `source`, `status`, `observed_at` |

## ConsumeRequest

| Field | 意義 |
| --- | --- |
| `organization_id` | Credential 與 decision tenant |
| `action_fingerprint` | Executor 重新計算的 binding |
| `policy_version` | Decision response 回傳的版本 |
| `execution_attempt_id` | Stable logical attempt ID |

## Examples

請參閱[建立 decision](create-decision.md#request-example)與 [Consume ALLOW](consume-decision.md#request-example)。
