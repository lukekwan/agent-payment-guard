---
description: 防止 credentials 與 sensitive values 進入 request 和 observability data。
---

# Secret handling

SignGate 需要 protected surfaces 的 metadata，而不是 raw secret values。

{% hint style="info" %}
**Primary constraint:** 任何 secret-like input 都必須 reject 或 deny，且不得 retain。
{% endhint %}

## 不得傳送

API keys、tokens、private keys、signing material、environment files、raw credential values 或完整 secret-bearing messages。

## Safe metadata

使用 boolean protected-surface flags、allowlisted identifiers、digests 與不揭露 secret 的 configuration fingerprints。

## Logging

使用 structured allowlists；在 log、trace、截圖或 support export 前 redact authorization headers 與 request fields。
