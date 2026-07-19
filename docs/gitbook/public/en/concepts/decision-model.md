---
description: Understand the object that connects policy evaluation to execution.
---

# Decision model

A SignGate decision records the evaluated action, outcome, fingerprint, policy version, validity window, reason codes, execution directive, and audit identifier.

{% hint style="info" %}
**Primary constraint:** Only a valid `ALLOW` can enter the consume step; every other result fails closed.
{% endhint %}

## Decision envelope

The envelope binds the outcome to `organization_id`, `request_id`, `bound_action`, `action_fingerprint`, `policy_version`, `issued_at`, and `expires_at`.

## Control responsibilities

The client validates transport and schema. The executor compares the bound action and fingerprint. SignGate performs the atomic state transition during consume.

## Decision values

See [ALLOW, REQUIRE_APPROVAL, and DENY](decision-values.md).
