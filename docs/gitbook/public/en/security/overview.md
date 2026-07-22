---
description: Understand the controls that make a decision enforceable.
---

# Security model

SignGate combines authenticated tenancy, strict request validation, action binding, short validity, single-use consume, and audit identifiers.

{% hint style="info" %}
**Primary constraint:** Security depends on the executor enforcing every check in order.
{% endhint %}

## Control layers

- Bearer authentication and scopes
- Organization isolation
- Strict schemas
- Mandates and evidence
- Action fingerprinting
- Expiry
- Atomic consume
- Redacted audit records

## Trust boundary

The client can propose an action; it cannot self-authorize. The executor can execute; it must first prove that SignGate authorized the same action.

## Preview boundary

See [Preview limitations](preview-limitations.md).
