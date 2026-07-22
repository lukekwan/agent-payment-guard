---
description: Apply least privilege to decision and consume callers.
---

# Authentication and scopes

Public API keys use bearer authentication and carry organization and scope context.

{% hint style="info" %}
**Primary constraint:** Separate agent and executor credentials when operational boundaries require it.
{% endhint %}

## Scopes

| Scope | Allows |
| --- | --- |
| `decision:create` | Submit an action for policy evaluation |
| `decision:consume` | Consume an eligible ALLOW |

## Rotation

Rotate credentials through your authorized secret-management process. Treat missing or revoked credentials as a hard stop.

## Transport

Send keys only over TLS to the authorized Preview execution environment.
