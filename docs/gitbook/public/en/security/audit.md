---
description: Correlate policy decisions with execution attempts without retaining unnecessary payloads.
---

# Audit records

Responses expose audit identifiers that clients can carry into execution telemetry and support workflows.

{% hint style="info" %}
**Primary constraint:** Auditability does not justify logging secrets or full sensitive content.
{% endhint %}

## Recommended fields

Organization, request ID, decision ID, audit ID, decision, reason codes, policy version, execution attempt ID, receipt ID, timestamps, and downstream result.

## Correlation

Carry the audit ID from evaluation and the receipt ID from consume into the executor's structured event.

## Access

Restrict audit access by organization and operational role.
