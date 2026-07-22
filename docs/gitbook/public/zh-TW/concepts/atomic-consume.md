---
description: 把符合資格的 ALLOW 轉換為一次性 execution receipt。
---

# Atomic consume

Executor 在 irreversible action 前，將 decision ID、action fingerprint、policy version 與 stable execution attempt ID 傳給 consume endpoint。

{% hint style="info" %}
**Primary constraint:** Consume 成功前不得執行 action。
{% endhint %}

## 單一 logical winner

Concurrent attempts 只會有一個 logical success；consume 後使用不同 attempt 會收到 conflict。

## Same-attempt retry

使用相同 `execution_attempt_id` retry 同一 decision 會回傳原始 receipt，可安全處理遺失的 response。

## Receipt

Receipt 會識別 decision、attempt、fingerprint、policy、executor 與 consume time。

## Endpoint

[POST /v1/decisions/{decision_id}/consume](../api-reference/consume-decision.md)
