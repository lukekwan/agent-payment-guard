---
description: ALLOW 在 consume 前超過 validity window 時安全恢復。
---

# 處理 expired decision

Expired decision 永久不可執行。

{% hint style="info" %}
**Primary constraint:** 不得在 client 端延長或覆蓋 `expires_at`。
{% endhint %}

## Recovery

1. 停止 pending action。
2. 重建目前完整 action 與 fresh evidence。
3. 使用新的 `request_id` 送出新 decision。
4. 驗證並 consume 新 `ALLOW`。

## 為何要 reevaluate

Policy、evidence、target state 與 configuration 可能已經改變。

## Observability

記錄原 decision 與 request identifiers，但不要保留 prohibited payload content。
