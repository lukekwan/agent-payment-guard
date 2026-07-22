---
description: 成功 consume 後 external action 失敗時安全處理。
---

# 處理 downstream execution failure

即使 external action 失敗，成功 consume 仍是永久的。

{% hint style="info" %}
**Primary constraint:** 不得為第二次 execution attempt 重用 consumed decision。
{% endhint %}

## Recovery

1. 記錄 consume receipt 與 downstream error。
2. 判斷實際 resulting system state。
3. 建立描述 retry、rollback 或 remediation 的新 action。
4. 下次 action 前取得新 decision 並 consume。

## 原因

Permanent consumption 防止 receipt 在 system state 已改變後授權無限 retries。

## 設計影響

Executor 應盡可能讓 downstream action idempotent，但 downstream idempotency 不能取代 SignGate consume semantics。
