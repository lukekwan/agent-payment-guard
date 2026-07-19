---
description: Prevent a decision from authorizing a different action.
---

# Action binding

SignGate returns the exact normalized action as `bound_action` and a SHA-256 `action_fingerprint` derived from a canonical action envelope.

{% hint style="info" %}
**Primary constraint:** Any execution-relevant difference requires a new decision.
{% endhint %}

## What is bound

Repository identity, target environment and service, commit, changed paths and routes, protected-surface flags, deployment strategy, command identifier, configuration fingerprint, and CI evidence contribute to the evaluated action.

## Set semantics

`changed_paths` and `changed_routes` are validated, exact duplicates are removed, and values are sorted deterministically while case-distinct values remain distinct.

## Executor check

Recompute the fingerprint from the proposed normalized action and compare it with both `bound_action` and `action_fingerprint` before consume.

## Details

See [Validate fingerprints](../guides/fingerprints.md).
