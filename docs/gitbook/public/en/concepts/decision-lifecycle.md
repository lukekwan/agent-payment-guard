---
description: Follow a decision from evaluation to one-time execution.
---

# Decision lifecycle

A decision moves through evaluation, verification, availability, atomic consume, and terminal consumed or expired states.

{% hint style="info" %}
**Primary constraint:** Consumption is permanent even when downstream execution later fails.
{% endhint %}

## Lifecycle

```text
REQUESTED → EVALUATED → AVAILABLE → CONSUMED
                              ↘ EXPIRED
```

## Availability

Only an unexpired `ALLOW` in the available state can be consumed. `REQUIRE_APPROVAL` and `DENY` never become executable.

## Terminal behavior

Consumed decisions cannot authorize a different attempt. Expired decisions require a new evaluation.

## Related

[Atomic consume](atomic-consume.md) · [Handle expired decisions](../guides/expired-decisions.md)
