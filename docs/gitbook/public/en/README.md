---
description: The policy and execution control layer for autonomous agents.
---

# Control what autonomous agents are allowed to execute.

**Preview**

SignGate evaluates sensitive agent actions before execution and returns an action-bound **ALLOW**, **REQUIRE_APPROVAL**, or **DENY** decision.

{% tabs %}
{% tab title="Get started" %}
[Integrate the complete decision and consume flow](getting-started/quickstart.md).
{% endtab %}

{% tab title="API reference" %}
[Review the two public endpoints](api-reference/overview.md).
{% endtab %}
{% endtabs %}

## One decision, three outcomes

<table data-view="cards">
  <thead>
    <tr>
      <th></th>
      <th></th>
      <th data-hidden data-card-target data-type="content-ref"></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>ALLOW</strong></td>
      <td>The exact action may proceed only after atomic consume succeeds.</td>
      <td><a href="concepts/decision-values.md#allow">concepts/decision-values.md#allow</a></td>
    </tr>
    <tr>
      <td><strong>REQUIRE_APPROVAL</strong></td>
      <td>Execution is paused until an authorized approval is supplied in a new decision request.</td>
      <td><a href="concepts/decision-values.md#require_approval">concepts/decision-values.md#require_approval</a></td>
    </tr>
    <tr>
      <td><strong>DENY</strong></td>
      <td>Execution must not proceed.</td>
      <td><a href="concepts/decision-values.md#deny">concepts/decision-values.md#deny</a></td>
    </tr>
  </tbody>
</table>

## How the decision flow works

{% stepper %}
{% step %}
### Agent submits the exact action

The request includes the target, execution parameters, mandate, and evidence.
{% endstep %}

{% step %}
### SignGate evaluates policy and evidence

SignGate authenticates the caller, validates the request, normalizes the action, and applies the active policy.
{% endstep %}

{% step %}
### SignGate returns a decision

The response binds the outcome to an action fingerprint, policy version, and expiry.
{% endstep %}

{% step %}
### Executor verifies and consumes ALLOW

The executor refuses every other result. It executes only after atomic consume returns a valid receipt.
{% endstep %}
{% endstepper %}

## Public endpoints

<table data-view="cards">
  <thead>
    <tr>
      <th></th>
      <th></th>
      <th data-hidden data-card-target data-type="content-ref"></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Create a decision</strong></td>
      <td>POST /v1/decisions</td>
      <td><a href="api-reference/create-decision.md">api-reference/create-decision.md</a></td>
    </tr>
    <tr>
      <td><strong>Atomically consume an ALLOW</strong></td>
      <td>POST /v1/decisions/{decision_id}/consume</td>
      <td><a href="api-reference/consume-decision.md">api-reference/consume-decision.md</a></td>
    </tr>
  </tbody>
</table>

{% hint style="warning" %}
Production execution is not currently available in this preview.
{% endhint %}
