---
description: 所有不確定狀態都必須導致 non-execution。
---

# Fail-closed enforcement

Client 與 executor 必須將 malformed、missing、timed-out、unexpected 或任何非 `ALLOW` 結果視為沒有授權。

{% hint style="info" %}
**Primary constraint:** 不得從 HTTP status、cached state、先前 approval 或沒有 error 推論 `ALLOW`。
{% endhint %}

## 停止條件

遇到 transport error、non-2xx、invalid schema、unknown decision、fingerprint mismatch、expired decision、consume conflict 或 invalid receipt 時都必須停止。

## Safe pseudocode

```text
response = createDecision(action)
assert response.decision == ALLOW
assert verifyBoundAction(response, action)
receipt = consume(response)
assert verifyReceipt(receipt, response)
execute(action)
```

## Operational rule

SignGate 或 dependency unavailable 時，依 application policy queue、defer 或 cancel action，不得繞過 gate。
