---
description: Provide the authority and observations policy needs to evaluate an action.
---

# Mandates and evidence

A mandate describes delegated scope and expiry. Evidence describes verified observations such as CI results bound to the proposed commit.

{% hint style="info" %}
**Primary constraint:** Descriptive intent never overrides a missing, expired, or insufficient mandate or failed evidence.
{% endhint %}

## Mandate

Include a stable mandate ID, permitted scopes, issuer, and expiry. Preview deployment evaluation expects the relevant preview scope.

## Evidence

Provide at least one evidence record. CI evidence must identify its run, commit, status, and checks.

## Freshness and binding

Evidence should be current and refer to the same subject and commit as the proposed action.

## Policy outcomes

Missing or failed required evidence results in a non-executable decision.
