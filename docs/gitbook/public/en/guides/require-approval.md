---
description: Pause execution and start the authorized approval workflow.
---

# Handle REQUIRE_APPROVAL

A `REQUIRE_APPROVAL` response is a non-executable policy result.

{% hint style="info" %}
**Primary constraint:** Do not consume or execute the decision that returned `REQUIRE_APPROVAL`.
{% endhint %}

## Client behavior

1. Record the decision ID, audit ID, and reason codes.
2. Present the exact bound action to the authorized approval process.
3. Wait for an authorized approval.
4. Submit a fresh decision request with the required approval evidence.
5. Evaluate the new response from the beginning.

## What not to do

Do not mutate the original response, locally convert it to `ALLOW`, reuse an expired approval, or skip the fresh evaluation.

## Related

[Decision values](../concepts/decision-values.md) · [Mandates and evidence](../concepts/mandates-and-evidence.md)
