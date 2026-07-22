---
description: 強制執行 policy evaluation 與 action execution 之間的最終邊界。
---

# 只有 consume 後才執行

Executor 負責最後檢查，並在 irreversible operation 前立即 consume。

{% hint style="info" %}
**Primary constraint:** Decision body 本身永遠不能授權 execution。
{% endhint %}

## Executor checklist

- Decision 必須是 `ALLOW`。
- Organization 符合 authenticated context。
- Bound action 符合 proposed normalized action。
- Fingerprint 符合 local recomputation。
- Policy version 與 expiry 可接受。
- Atomic consume 成功。
- Receipt 符合 decision 與 execution attempt。

## 操作順序

```text
prepare → decide → verify → consume → execute
```

## Failure

任何 failed check 都必須停止 execution，並產生 redacted operational event。
