---
description: Understand how long preview control records are expected to remain available.
---

# Retention

Preview decision, approval, audit, idempotency, and consume records use a 30-day retention window.

{% hint style="info" %}
**Primary constraint:** Do not rely on the preview store as a permanent business-record archive.
{% endhint %}

## Data minimization

Retain only the control metadata required for idempotency, expiry, audit, and single-use enforcement.

## Client responsibility

Export the minimal identifiers your compliance process requires without copying prohibited secret or payload material.

## Production

Production retention, deletion, residency, backup, and legal-hold policies are not defined by this preview documentation.
