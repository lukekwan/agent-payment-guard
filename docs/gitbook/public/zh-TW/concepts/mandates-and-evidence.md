---
description: 提供 policy evaluation 所需的 authority 與 observations。
---

# Mandates 與 evidence

Mandate 描述 delegated scope 與 expiry；evidence 描述已驗證的 observation，例如與 proposed commit 綁定的 CI result。

{% hint style="info" %}
**Primary constraint:** Descriptive intent 不能覆蓋缺少、過期或不足的 mandate，也不能覆蓋 failed evidence。
{% endhint %}

## Mandate

包含 stable mandate ID、permitted scopes、issuer 與 expiry。Preview deployment evaluation 需要相關 preview scope。

## Evidence

至少提供一筆 evidence record。CI evidence 必須識別 run、commit、status 與 checks。

## Freshness 與 binding

Evidence 應保持最新，並指向與 proposed action 相同的 subject 與 commit。

## Policy outcomes

缺少或 failed mandatory evidence 會得到不可執行的 decision。
