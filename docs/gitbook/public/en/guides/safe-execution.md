---
description: Enforce the final boundary between policy evaluation and action execution.
---

# Execute only after consume

The executor owns the last-mile checks and must consume immediately before the irreversible operation.

{% hint style="info" %}
**Primary constraint:** A decision body alone never authorizes execution.
{% endhint %}

## Executor checklist

- Decision is exactly `ALLOW`.
- Organization matches authenticated context.
- Bound action matches the proposed normalized action.
- Fingerprint matches local recomputation.
- Policy version and expiry are accepted.
- Atomic consume succeeds.
- Receipt matches the decision and execution attempt.

## Order of operations

```text
prepare → decide → verify → consume → execute
```

## Failure

Any failed check stops execution and emits a redacted operational event.
