---
description: Understand where SignGate sits in an agent execution path.
---

# Introduction

SignGate is the policy and execution control layer for autonomous agents. Use it before an agent performs a sensitive action so the executor receives an explicit, action-bound decision.

{% hint style="info" %}
**Primary constraint:** A decision response is not a substitute for executor enforcement.
{% endhint %}

## What SignGate solves

Autonomous agents can propose actions faster than people can inspect them. SignGate turns policy, mandates, and evidence into a deterministic decision that an executor can enforce.

## What SignGate returns

- `ALLOW` — eligible for atomic consume.
- `REQUIRE_APPROVAL` — paused and not executable.
- `DENY` — refused and not executable.

## Integration boundary

The agent prepares the exact action. SignGate evaluates it. The executor independently verifies the response, consumes an `ALLOW`, and performs the same bound action.

## Next

Continue with the [Quickstart](quickstart.md) or review the [Decision model](../concepts/decision-model.md).
