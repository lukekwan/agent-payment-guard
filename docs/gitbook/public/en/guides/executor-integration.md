---
description: Place SignGate enforcement directly in the execution path.
---

# Integrate with an executor

The executor must be unable to invoke the sensitive action without a verified consume receipt.

{% hint style="info" %}
**Primary constraint:** A logging-only or advisory integration is not enforcement.
{% endhint %}

## Recommended adapter

Expose one wrapper that accepts the proposed action, calls SignGate, validates `ALLOW`, consumes it, verifies the receipt, and only then invokes the underlying executor.

## Isolation

Keep API keys in the runtime secret manager. Give the adapter only the scopes and network access required for decision and consume calls.

## Telemetry

Emit request, decision, audit, attempt, and receipt identifiers plus reason codes. Redact credentials and prohibited action content.

## Failure policy

All exceptions, unknown responses, validation failures, and timeouts return a non-execution result to the caller.
