---
description: Authenticate requests to the Preview execution environment.
---

# Authentication

Every public request uses a bearer API key associated with one organization and a defined set of scopes.

{% hint style="info" %}
**Primary constraint:** Never place a raw API key in source code, logs, screenshots, or support messages.
{% endhint %}

## Authorization header

```http
Authorization: Bearer <SIGNGATE_API_KEY>
```

## Environment variables

```bash
export SIGNGATE_BASE_URL="https://preview.example.signgate"
export SIGNGATE_API_KEY="<preview-api-key>"
```

## Required scopes

| Operation | Scope |
| --- | --- |
| Create a decision | `decision:create` |
| Consume an `ALLOW` | `decision:consume` |

## Organization binding

The `organization_id` in the request must match the organization associated with the credential. A tenant mismatch is refused without revealing whether another tenant's resource exists.

## Next

[Make your first decision](first-decision.md).
