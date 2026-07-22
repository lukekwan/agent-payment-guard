---
description: Use stable reason codes for logs, metrics, and user guidance.
---

# Reason codes

Reason codes explain why a decision or error occurred; clients must still enforce the top-level decision and HTTP semantics.

{% hint style="info" %}
**Primary constraint:** Never treat an unknown reason code as authorization.
{% endhint %}

## Decision examples

| Code | Decision | Meaning |
| --- | --- | --- |
| `PREVIEW_DEPLOY_POLICY_PASSED` | `ALLOW` | Preview policy and required evidence passed |
| `PERMISSION_CHANGE_REQUIRES_APPROVAL` | `REQUIRE_APPROVAL` | Protected permission surface requires authorized approval |
| `SECRET_CHANGE_NOT_SUPPORTED_V0_1` | `DENY` | Secret-changing action is not supported |
| `MANDATE_EXPIRED` | `DENY` | Delegated authority has expired |

## Consume examples

| Code | Meaning |
| --- | --- |
| `DECISION_ALREADY_CONSUMED` | Another attempt consumed the decision |
| `DECISION_EXPIRED` | The validity window closed |
| `DECISION_NOT_CONSUMABLE` | Outcome, state, fingerprint, policy, or binding is invalid |

## Logging

Record the request ID, audit ID, HTTP status, decision, and reason codes. Do not log API keys or prohibited action content.
