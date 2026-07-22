---
description: Submit a deployment proposal before an agent invokes a preview executor.
---

# Evaluate a preview deployment

Use this workflow after tests finish and before any deployment command starts.

{% hint style="info" %}
**Primary constraint:** The request must describe the exact action that the executor will perform.
{% endhint %}

## Workflow

1. Collect the target, revision, changed surfaces, configuration fingerprint, and passing CI evidence.
2. Confirm the mandate permits preview deployment.
3. Submit `POST /v1/decisions`.
4. Stop on every result except verified `ALLOW`.
5. Consume immediately before execution.

## Protected surfaces

Declare secrets, DNS, permissions, and credential changes accurately. Omitting a flag invalidates the action description and must fail validation or enforcement.

## Next

[Execute only after consume](safe-execution.md).
