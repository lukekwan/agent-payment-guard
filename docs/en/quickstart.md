---
description: Create and atomically consume your first SignGate preview decision in five minutes.
---

# 5-minute quickstart

This guide creates a preview deployment decision, verifies that it is executable, and atomically consumes it immediately before deployment.

{% hint style="warning" %}
SignGate v0.1 authorizes preview/local actions only. The host and credentials below are placeholders; use values supplied by an authorized integration.
{% endhint %}

{% stepper %}
{% step %}
### Configure the environment

```bash
export SIGNGATE_BASE_URL="https://preview.signgate.local"
export SIGNGATE_AGENT_KEY="<decision:create credential>"
export SIGNGATE_EXECUTOR_KEY="<decision:consume credential>"
```

Never place a raw credential in source code, commits, logs, or D1.
{% endstep %}

{% step %}
### Create a decision

The complete request includes agent identity, repository and commit, changed paths, CI evidence, a mandate, and every protected-surface flag.

{% tabs %}
{% tab title="cURL" %}
```bash
./docs/examples/curl/create-decision.sh
```
{% endtab %}

{% tab title="JavaScript" %}
```bash
node docs/examples/javascript/create-decision.mjs
```
{% endtab %}

{% tab title="Python" %}
```bash
python3 docs/examples/python/create_decision.py
```
{% endtab %}
{% endtabs %}

[Review the full request and response](api-reference/create-decision.md).
{% endstep %}

{% step %}
### Verify `ALLOW`

HTTP `200` only means evaluation completed. Before continuing, verify that:

- `decision` is `ALLOW`
- `bound_action` exactly matches the proposed action
- `action_fingerprint` matches the local canonical fingerprint
- `expires_at` has not passed
- `execution_directive.action` is `EXECUTE`

Neither `REQUIRE_APPROVAL` nor `DENY` authorizes execution.
{% endstep %}

{% step %}
### Consume the decision

```bash
export SIGNGATE_DECISION_ID="dec_doc_001"
export SIGNGATE_ACTION_FINGERPRINT="sha256:..."
export SIGNGATE_POLICY_VERSION="deploy_policy_2026_07_18_01"
export SIGNGATE_EXECUTION_ATTEMPT_ID="exec_preview_001"

./docs/examples/curl/consume-decision.sh
```

The executor may run the same bound action only after atomic consume returns a valid receipt.
{% endstep %}
{% endstepper %}

## Next steps

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
      <td><strong>Decision lifecycle</strong></td>
      <td>Understand how single-use decisions prevent replay and action substitution.</td>
      <td><a href="decision-lifecycle.md">decision-lifecycle.md</a></td>
    </tr>
    <tr>
      <td><strong>API reference</strong></td>
      <td>Explore complete requests, responses, and error statuses.</td>
      <td><a href="api-reference/README.md">api-reference/README.md</a></td>
    </tr>
    <tr>
      <td><strong>Error handling</strong></td>
      <td>Keep every agent failure mode fail closed.</td>
      <td><a href="errors.md">errors.md</a></td>
    </tr>
  </tbody>
</table>
