---
description: Understand fields sent to decision and consume operations.
---

# Request schemas

Request schemas are strict and bind authentication context, the complete action, authority, evidence, and execution attempt identifiers.

{% hint style="info" %}
**Primary constraint:** Do not omit or approximate execution-relevant fields.
{% endhint %}

## DecisionRequest

| Object | Important fields |
| --- | --- |
| Root | `contract_version`, `request_id`, `organization_id` |
| Agent | `id`, `type`, `authenticated_by` |
| Action target | `environment`, `service`, `repository` |
| Action parameters | commit, digests, paths, routes, protected flags, strategy, command, configuration fingerprint, CI evidence |
| Mandate | `id`, `scope`, `issued_by`, `expires_at` |
| Evidence | `id`, `type`, `source`, `status`, `observed_at` |

## ConsumeRequest

| Field | Meaning |
| --- | --- |
| `organization_id` | Credential and decision tenant |
| `action_fingerprint` | Executor-recomputed binding |
| `policy_version` | Version returned with the decision |
| `execution_attempt_id` | Stable logical attempt identifier |

## Examples

See [Create a decision](create-decision.md#request-example) and [Consume an ALLOW](consume-decision.md#request-example).
