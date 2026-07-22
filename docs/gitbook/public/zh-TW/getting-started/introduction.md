---
description: 了解 SignGate 在 agent execution path 中的位置。
---

# 介紹

SignGate 是自主代理的 policy 與 execution control layer。Agent 執行敏感 action 前，SignGate 會提供明確且與 action 綁定的 decision。

{% hint style="info" %}
**Primary constraint:** Decision response 不能取代 executor enforcement。
{% endhint %}

## SignGate 解決的問題

自主代理提出 action 的速度可能超過人工審查能力。SignGate 會把 policy、mandate 與 evidence 轉換成 executor 可強制執行的 deterministic decision。

## SignGate 回傳什麼

- `ALLOW` — 可以進入 atomic consume。
- `REQUIRE_APPROVAL` — 暫停，且不可執行。
- `DENY` — 拒絕，且不可執行。

## 整合邊界

Agent 準備完整 action，SignGate 負責評估，executor 獨立驗證 response、consume `ALLOW`，再執行相同的 bound action。

## 下一步

前往[快速開始](quickstart.md)或閱讀 [Decision model](../concepts/decision-model.md)。
