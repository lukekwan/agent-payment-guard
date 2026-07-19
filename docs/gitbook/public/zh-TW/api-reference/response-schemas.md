---
description: 驗證 decision、receipt 與 error payloads。
---

# Response schemas

Responses 會區分成功的 policy evaluation 與 transport、authentication、validation、conflict 和 dependency failures。

{% hint style="info" %}
**Primary constraint:** 只有 `DecisionResponse.decision: ALLOW` 可以進入 consume。
{% endhint %}

## DecisionResponse

包含 decision 與 request IDs、organization、fingerprint、完整 bound action、policy version、validity window、reason codes、required checks、approval requirement、execution directive 與 audit ID。

## ConsumeResponse

包含與 organization、decision、execution attempt、fingerprint、policy version、executor 與 consume time 綁定的 receipt。

## ErrorResponse

包含 `error`、`reason_codes`、optional request/audit identifiers 與 `enforcement_effect: DENY`；不包含 policy decision。

## Validation

拒絕缺少 required fields、unknown decision、invalid timestamp、malformed fingerprint 或與 request 不匹配的 receipt。
