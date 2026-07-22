---
description: 理解連接 policy evaluation 與 execution 的物件。
---

# Decision model

SignGate decision 會記錄 evaluated action、outcome、fingerprint、policy version、有效期間、reason codes、execution directive 與 audit identifier。

{% hint style="info" %}
**Primary constraint:** 只有有效的 `ALLOW` 可以進入 consume；其他結果一律 fail closed。
{% endhint %}

## Decision envelope

Envelope 會將結果綁定到 `organization_id`、`request_id`、`bound_action`、`action_fingerprint`、`policy_version`、`issued_at` 與 `expires_at`。

## 控制責任

Client 驗證 transport 與 schema，executor 比對 bound action 與 fingerprint，SignGate 在 consume 時執行 atomic state transition。

## Decision values

請參閱 [ALLOW、REQUIRE_APPROVAL 與 DENY](decision-values.md)。
