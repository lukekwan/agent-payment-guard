---
description: Keep credentials and sensitive values out of requests and observability data.
---

# Secret handling

SignGate needs metadata about protected surfaces, not raw secret values.

{% hint style="info" %}
**Primary constraint:** Any secret-like input must be rejected or denied and must not be retained.
{% endhint %}

## Never send

API keys, tokens, private keys, signing material, environment files, raw credential values, or full secret-bearing messages.

## Safe metadata

Use boolean protected-surface flags, allowlisted identifiers, digests, and configuration fingerprints that do not reveal the underlying secret.

## Logging

Use structured allowlists. Redact authorization headers and request fields before logs, traces, screenshots, or support exports.
