---
description: 將 decisions 與 receipts 限制在 authenticated organization boundary。
---

# Tenant isolation

所有 request、decision 與 consume lookup 都使用 credential 所屬 organization 做 scope。

{% hint style="info" %}
**Primary constraint:** Body 提供的 `organization_id` 不能覆蓋 authenticated context。
{% endhint %}

## Enforcement

存取 tenant-scoped record 前，SignGate 會比較 body organization 與 credential organization。

## Non-enumeration

Cross-tenant failure 不會揭露其他 tenant 是否存在 decision、request 或 receipt。

## Client design

每個 organization 使用分離的 credentials 與 identifiers；不要用 privileged shared credential proxy 不受信任的 tenant ID。
