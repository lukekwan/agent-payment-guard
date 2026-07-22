---
description: 對 decision 與 consume callers 套用 least privilege。
---

# Authentication 與 scopes

Public API keys 使用 bearer authentication，並帶有 organization 與 scope context。

{% hint style="info" %}
**Primary constraint:** Operational boundary 需要時，分離 agent 與 executor credentials。
{% endhint %}

## Scopes

| Scope | 允許 |
| --- | --- |
| `decision:create` | 提交 action 進行 policy evaluation |
| `decision:consume` | Consume eligible ALLOW |

## Rotation

透過 authorized secret-management process rotation；missing 或 revoked credential 一律 hard stop。

## Transport

只能透過 TLS 傳送 key 到 authorized Preview execution environment。
