---
description: Prevent a valid decision from authorizing repeated executions.
---

# Replay protection

An ALLOW is short-lived, action-bound, policy-bound, organization-bound, and single-use.

{% hint style="info" %}
**Primary constraint:** The executor must not implement local consume caching as a replacement for the atomic service operation.
{% endhint %}

## Decision replay

An expired or consumed decision is permanently non-executable.

## Attempt replay

The same attempt can recover its original receipt; a different attempt cannot reuse the consumed decision.

## Action substitution

A fingerprint or bound-action mismatch prevents a decision from being moved to a different target or parameter set.
