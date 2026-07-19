---
description: 理解 documented surface 的 operational status。
---

# API status

Documented API 是 authorized Preview execution environment 提供的 preview integration surface。

{% hint style="info" %}
**Primary constraint:** 此頁不是 real-time uptime dashboard。
{% endhint %}

## 目前 status

| Surface | Status |
| --- | --- |
| Decision API v0.1 | Preview |
| Production execution | Not available |
| Commerce/x402 enforcement | Not live |

## Incidents

發生 operational failure 時，記錄 HTTP status、request ID、audit ID 與 timestamp，不包含 credentials 或 prohibited content。

## Retry

使用[安全 retry](../guides/retries.md)指南。
