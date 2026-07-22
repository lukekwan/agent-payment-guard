---
description: 理解讓 decision 可強制執行的 controls。
---

# Security model

SignGate 結合 authenticated tenancy、strict request validation、action binding、short validity、single-use consume 與 audit identifiers。

{% hint style="info" %}
**Primary constraint:** Security 依賴 executor 依序強制執行所有檢查。
{% endhint %}

## Control layers

- Bearer authentication 與 scopes
- Organization isolation
- Strict schemas
- Mandates 與 evidence
- Action fingerprinting
- Expiry
- Atomic consume
- Redacted audit records

## Trust boundary

Client 可以提出 action，但不能自行授權；executor 可以執行，但必須先證明 SignGate 授權同一 action。

## Preview boundary

請參閱 [Preview limitations](preview-limitations.md)。
