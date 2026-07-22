---
description: Make uncertainty result in non-execution.
---

# Fail-closed enforcement

Clients and executors must interpret every malformed, missing, timed-out, unexpected, or non-`ALLOW` result as no authorization.

{% hint style="info" %}
**Primary constraint:** Never infer `ALLOW` from an HTTP status, cached state, previous approval, or absence of an error.
{% endhint %}

## Stop conditions

Stop on transport errors, non-2xx responses, invalid schemas, unknown decision values, mismatched fingerprints, expired decisions, consume conflicts, and invalid receipts.

## Safe pseudocode

```text
response = createDecision(action)
assert response.decision == ALLOW
assert verifyBoundAction(response, action)
receipt = consume(response)
assert verifyReceipt(receipt, response)
execute(action)
```

## Operational rule

If SignGate or a dependency is unavailable, queue, defer, or cancel the action according to your application policy; do not bypass the gate.
