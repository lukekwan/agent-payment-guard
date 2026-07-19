---
description: Turn an eligible ALLOW into a one-time execution receipt.
---

# Atomic consume

Immediately before an irreversible action, the executor sends the decision ID, action fingerprint, policy version, and a stable execution attempt ID to the consume endpoint.

{% hint style="info" %}
**Primary constraint:** No action may execute before consume succeeds.
{% endhint %}

## One logical winner

Concurrent attempts produce one logical success. A different attempt after consumption receives a conflict.

## Same-attempt retry

Retrying the same decision with the same `execution_attempt_id` returns the original receipt, allowing safe recovery from a lost response.

## Receipt

The receipt identifies the decision, attempt, fingerprint, policy, executor, and consume time.

## Endpoint

[POST /v1/decisions/{decision_id}/consume](../api-reference/consume-decision.md)
