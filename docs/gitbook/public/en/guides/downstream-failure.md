---
description: Respond safely when execution fails after a successful consume.
---

# Handle downstream execution failure

A successful consume is permanent even if the external action fails.

{% hint style="info" %}
**Primary constraint:** Do not reuse the consumed decision for a second execution attempt.
{% endhint %}

## Recovery

1. Record the consume receipt and downstream error.
2. Determine the real resulting system state.
3. Build a new action describing any retry, rollback, or remediation.
4. Obtain a fresh decision and consume it before the next action.

## Reason

Permanent consumption prevents a receipt from authorizing an unbounded number of retries after system state has changed.

## Design implication

Executors should make downstream actions idempotent where possible, but downstream idempotency does not replace SignGate consume semantics.
