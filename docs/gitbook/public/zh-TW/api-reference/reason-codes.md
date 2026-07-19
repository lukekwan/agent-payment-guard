---
description: 使用 stable reason codes 進行 log、metrics 與 user guidance。
---

# Reason codes

Reason codes 解釋 decision 或 error 原因；client 仍必須強制執行 top-level decision 與 HTTP semantics。

{% hint style="info" %}
**Primary constraint:** Unknown reason code 絕不能視為授權。
{% endhint %}

## Decision examples

| Code | Decision | 意義 |
| --- | --- | --- |
| `PREVIEW_DEPLOY_POLICY_PASSED` | `ALLOW` | Preview policy 與 required evidence 通過 |
| `PERMISSION_CHANGE_REQUIRES_APPROVAL` | `REQUIRE_APPROVAL` | Protected permission surface 需要 authorized approval |
| `SECRET_CHANGE_NOT_SUPPORTED_V0_1` | `DENY` | 不支援 secret-changing action |
| `MANDATE_EXPIRED` | `DENY` | Delegated authority 已過期 |

## Consume examples

| Code | 意義 |
| --- | --- |
| `DECISION_ALREADY_CONSUMED` | 另一 attempt 已 consume decision |
| `DECISION_EXPIRED` | Validity window 已關閉 |
| `DECISION_NOT_CONSUMABLE` | Outcome、state、fingerprint、policy 或 binding invalid |

## Logging

記錄 request ID、audit ID、HTTP status、decision 與 reason codes；不得記錄 API keys 或 prohibited action content。
