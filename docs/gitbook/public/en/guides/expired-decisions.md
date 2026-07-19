---
description: Recover when an ALLOW validity window closes before consume.
---

# Handle expired decisions

An expired decision is permanently non-executable.

{% hint style="info" %}
**Primary constraint:** Never extend or override `expires_at` client-side.
{% endhint %}

## Recovery

1. Stop the pending action.
2. Rebuild the current exact action and fresh evidence.
3. Submit a new decision request with a new `request_id`.
4. Verify and consume the new `ALLOW`.

## Why reevaluation matters

Policy, evidence, target state, and configuration may have changed since the previous evaluation.

## Observability

Record the original decision and request identifiers without retaining prohibited payload content.
