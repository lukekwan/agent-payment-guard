---
description: Plan integrations around the current execution and operational boundary.
---

# Preview limitations

The Preview execution environment evaluates `deploy_change` actions for preview/local execution.

{% hint style="info" %}
**Primary constraint:** Production execution is not currently available in this preview.
{% endhint %}

## Current scope

Decision creation, action binding, expiry, reason codes, fail-closed handling, and atomic consume for preview deployment actions.

## Not live

Production execution and commerce/x402 enforcement are not live capabilities of this public preview.

## Integration planning

Treat non-live contexts as future compatibility considerations only; do not build production authorization assumptions on them.
