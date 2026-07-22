---
description: 防止 valid decision 授權重複 execution。
---

# Replay protection

ALLOW 是 short-lived、action-bound、policy-bound、organization-bound 且 single-use。

{% hint style="info" %}
**Primary constraint:** Executor 不得使用 local consume cache 取代 atomic service operation。
{% endhint %}

## Decision replay

Expired 或 consumed decision 永久不可執行。

## Attempt replay

相同 attempt 可恢復原 receipt；不同 attempt 不得重用 consumed decision。

## Action substitution

Fingerprint 或 bound-action mismatch 會阻止 decision 被移到不同 target 或 parameters。
