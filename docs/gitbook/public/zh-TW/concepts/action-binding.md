---
description: 防止 decision 被用來授權不同的 action。
---

# Action binding

SignGate 回傳完整 normalized `bound_action`，以及從 canonical action envelope 衍生的 SHA-256 `action_fingerprint`。

{% hint style="info" %}
**Primary constraint:** 任何 execution-relevant 差異都需要新的 decision。
{% endhint %}

## 綁定內容

Repository identity、target environment 與 service、commit、changed paths 與 routes、protected-surface flags、deployment strategy、command identifier、configuration fingerprint 與 CI evidence 都屬於 evaluated action。

## Set semantics

`changed_paths` 與 `changed_routes` 會先驗證、移除 exact duplicates，再 deterministic sorting；大小寫不同的值保持不同。

## Executor 檢查

Consume 前，從 proposed normalized action 重新計算 fingerprint，並與 `bound_action` 及 `action_fingerprint` 比對。

## 詳情

請參閱[驗證 fingerprints](../guides/fingerprints.md)。
