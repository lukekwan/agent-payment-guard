---
description: 將 SignGate enforcement 直接放進 execution path。
---

# 整合 executor

Executor 在沒有 verified consume receipt 時，必須無法呼叫 sensitive action。

{% hint style="info" %}
**Primary constraint:** Logging-only 或 advisory integration 不構成 enforcement。
{% endhint %}

## Recommended adapter

提供單一 wrapper：接收 proposed action、呼叫 SignGate、驗證 `ALLOW`、consume、驗證 receipt，最後才呼叫 underlying executor。

## Isolation

將 API keys 放在 runtime secret manager；adapter 只取得 decision/consume 所需 scopes 與 network access。

## Telemetry

產生 request、decision、audit、attempt 與 receipt identifiers 加上 reason codes；redact credentials 與 prohibited action content。

## Failure policy

所有 exception、unknown response、validation failure 與 timeout 都回傳 non-execution。
