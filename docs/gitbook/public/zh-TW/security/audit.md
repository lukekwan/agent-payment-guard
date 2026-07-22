---
description: 在不保留不必要 payload 的前提下關聯 policy decisions 與 execution attempts。
---

# Audit records

Responses 會提供 audit identifiers，client 可將其帶入 execution telemetry 與 support workflow。

{% hint style="info" %}
**Primary constraint:** Auditability 不能作為記錄 secrets 或完整 sensitive content 的理由。
{% endhint %}

## 建議 fields

Organization、request ID、decision ID、audit ID、decision、reason codes、policy version、execution attempt ID、receipt ID、timestamps 與 downstream result。

## Correlation

將 evaluation 的 audit ID 與 consume 的 receipt ID 帶入 executor structured event。

## Access

依 organization 與 operational role 限制 audit access。
