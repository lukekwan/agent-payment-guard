---
description: Validate decision, receipt, and error payloads.
---

# Response schemas

Responses separate successful policy evaluation from transport, authentication, validation, conflict, and dependency failures.

{% hint style="info" %}
**Primary constraint:** Only `DecisionResponse.decision: ALLOW` can be considered for consume.
{% endhint %}

## DecisionResponse

Includes decision and request IDs, organization, fingerprint, complete bound action, policy version, validity window, reason codes, required checks, approval requirement, execution directive, and audit ID.

## ConsumeResponse

Contains a receipt bound to the organization, decision, execution attempt, fingerprint, policy version, executor, and consume time.

## ErrorResponse

Contains `error`, `reason_codes`, optional request and audit identifiers, and `enforcement_effect: DENY`. It never contains a policy decision.

## Validation

Reject missing required fields, unknown decision values, invalid timestamps, malformed fingerprints, and any receipt that does not match the request.
