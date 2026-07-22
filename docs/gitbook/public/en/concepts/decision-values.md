---
description: Handle every policy outcome without ambiguity.
---

# ALLOW, REQUIRE_APPROVAL, and DENY

The decision value tells the client whether the requested action is eligible to continue, requires a new approved request, or must stop.

{% hint style="info" %}
**Primary constraint:** HTTP `200` means evaluation completed; it does not by itself authorize execution.
{% endhint %}

## ALLOW

The exact normalized action is eligible to proceed only after the executor verifies the response and atomic consume succeeds.

## REQUIRE_APPROVAL

Execution is not authorized. After an authorized approval is obtained, submit a fresh decision request and evaluate the new response.

## DENY

Execution must not proceed. Do not retry unchanged inputs as a way to bypass policy.

## Fail-closed client rule

```text
if decision != ALLOW: stop
if verification fails: stop
if consume fails: stop
execute only after a valid consume receipt
```
