---
description: 依目前 execution 與 operational boundary 規劃 integration。
---

# Preview limitations

Preview execution environment 會評估 preview/local execution 的 `deploy_change` actions。

{% hint style="info" %}
**Primary constraint:** 此 preview 目前不提供 production execution。
{% endhint %}

## 目前 scope

Preview deployment actions 的 decision creation、action binding、expiry、reason codes、fail-closed handling 與 atomic consume。

## 尚未 live

Production execution 與 commerce/x402 enforcement 不是此 public preview 的 live capability。

## Integration planning

只將 non-live context 視為未來 compatibility consideration；不要建立 production authorization assumption。
