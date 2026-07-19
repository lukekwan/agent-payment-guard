---
description: 從 evaluation 到單次 execution 追蹤 decision。
---

# Decision 生命週期

Decision 會經過 evaluation、verification、available、atomic consume，以及 terminal consumed 或 expired 狀態。

{% hint style="info" %}
**Primary constraint:** 即使 downstream execution 失敗，consume 仍是永久的。
{% endhint %}

## Lifecycle

```text
REQUESTED → EVALUATED → AVAILABLE → CONSUMED
                              ↘ EXPIRED
```

## Availability

只有未過期且 state 為 available 的 `ALLOW` 可以 consume；`REQUIRE_APPROVAL` 與 `DENY` 永遠不可執行。

## Terminal behavior

Consumed decision 不能授權不同 attempt；expired decision 必須重新 evaluation。

## 相關內容

[Atomic consume](atomic-consume.md) · [處理 expired decision](../guides/expired-decisions.md)
