---
description: Create a decision, fail closed, consume ALLOW, and continue only after success.
---

# Quickstart

This Quickstart demonstrates the complete Preview execution environment flow. The example uses one API key with both create and consume scopes.

{% hint style="warning" %}
Any non-ALLOW result, verification failure, or consume failure must stop execution.
{% endhint %}

## 1. Configure the environment

```bash
export SIGNGATE_BASE_URL="https://preview.example.signgate"
export SIGNGATE_API_KEY="<preview-api-key>"
```

## 2. Prepare the request

Save the following JSON as `decision-request.json` and replace the commit and timestamp placeholders.

```json
{
  "contract_version": "0.1",
  "request_id": "req_preview_001",
  "organization_id": "org_example",
  "agent": {
    "id": "agent_ci_01",
    "type": "coding_agent",
    "authenticated_by": "service_identity"
  },
  "action": {
    "type": "deploy_change",
    "target": {
      "environment": "preview",
      "service": "agent-service",
      "project": "preview-project",
      "repository": {
        "host": "github.com",
        "owner": "example",
        "repo": "agent-service",
        "remote_url": "https://github.com/example/agent-service"
      }
    },
    "parameters": {
      "git_commit": "<commit-sha>",
      "diff_digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222",
      "changed_paths": ["src/worker.js"],
      "changed_routes": ["/preview"],
      "touches_secrets": false,
      "touches_dns": false,
      "touches_permissions": false,
      "touches_credentials": false,
      "deployment_strategy": "worker_preview",
      "deployment_command_id": "deploy:preview",
      "configuration_fingerprint": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
      "ci_evidence": {
        "provider": "github_actions",
        "run_id": "run_preview_001",
        "commit": "<commit-sha>",
        "status": "passed",
        "checks": ["lint", "unit", "contract"]
      }
    }
  },
  "intent": "Deploy validated changes to preview",
  "mandate": {
    "id": "mandate_preview_001",
    "scope": ["deploy:preview"],
    "issued_by": "authorized_issuer",
    "expires_at": "<future-rfc3339-timestamp>"
  },
  "evidence": [{
    "id": "evidence_ci_001",
    "type": "test_result",
    "source": "ci",
    "status": "passed",
    "observed_at": "<current-rfc3339-timestamp>"
  }],
  "context": {
    "requested_at": "<current-rfc3339-timestamp>"
  }
}
```

## 3. Create, decide, and consume

{% tabs %}
{% tab title="cURL" %}
```bash
set -euo pipefail

decision_response="$(curl --fail-with-body --silent --show-error \
  "$SIGNGATE_BASE_URL/v1/decisions" \
  -H "Authorization: Bearer $SIGNGATE_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @decision-request.json)"

decision="$(printf '%s' "$decision_response" | jq -r '.decision // empty')"
if [ "$decision" != "ALLOW" ]; then
  printf 'Execution stopped: decision=%s\n' "${decision:-ERROR}" >&2
  exit 1
fi

decision_id="$(printf '%s' "$decision_response" | jq -r '.decision_id')"
fingerprint="$(printf '%s' "$decision_response" | jq -r '.action_fingerprint')"
policy_version="$(printf '%s' "$decision_response" | jq -r '.policy_version')"

consume_body="$(jq -n \
  --arg organization_id "org_example" \
  --arg action_fingerprint "$fingerprint" \
  --arg policy_version "$policy_version" \
  '{contract_version:"0.1", organization_id:$organization_id, action_fingerprint:$action_fingerprint, policy_version:$policy_version, execution_attempt_id:"exec_preview_001"}')"

consume_response="$(curl --fail-with-body --silent --show-error \
  "$SIGNGATE_BASE_URL/v1/decisions/$decision_id/consume" \
  -H "Authorization: Bearer $SIGNGATE_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary "$consume_body")"

receipt_id="$(printf '%s' "$consume_response" | jq -r '.receipt.consume_receipt_id // empty')"
test -n "$receipt_id" || { echo "Execution stopped: invalid consume receipt" >&2; exit 1; }
echo "Consume succeeded; continue with the exact bound action."
```
{% endtab %}

{% tab title="JavaScript" %}
```javascript
import { readFile } from "node:fs/promises";

const baseUrl = process.env.SIGNGATE_BASE_URL;
const apiKey = process.env.SIGNGATE_API_KEY;
if (!baseUrl || !apiKey) throw new Error("Missing SignGate environment variables");

const request = JSON.parse(await readFile("decision-request.json", "utf8"));
const call = async (path, body) => {
  const response = await fetch(baseUrl + path, {
    method: "POST",
    headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error("SignGate request failed: " + response.status);
  return payload;
};

const result = await call("/v1/decisions", request);
if (result.decision !== "ALLOW") throw new Error("Execution stopped: " + result.decision);
if (JSON.stringify(result.bound_action) !== JSON.stringify(request.action)) {
  throw new Error("Execution stopped: bound action mismatch");
}

const consumed = await call("/v1/decisions/" + result.decision_id + "/consume", {
  contract_version: "0.1",
  organization_id: request.organization_id,
  action_fingerprint: result.action_fingerprint,
  policy_version: result.policy_version,
  execution_attempt_id: "exec_preview_001"
});
if (!consumed.receipt?.consume_receipt_id) throw new Error("Execution stopped: invalid receipt");
console.log("Consume succeeded; continue with the exact bound action.");
```
{% endtab %}

{% tab title="Python" %}
```python
import json
import os
import urllib.error
import urllib.request

base_url = os.environ["SIGNGATE_BASE_URL"]
api_key = os.environ["SIGNGATE_API_KEY"]
with open("decision-request.json", encoding="utf-8") as source:
    request_body = json.load(source)

def call(path, body):
    req = urllib.request.Request(
        base_url + path,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        raise RuntimeError("Execution stopped: SignGate request failed") from exc

result = call("/v1/decisions", request_body)
if result.get("decision") != "ALLOW":
    raise RuntimeError(f"Execution stopped: {result.get('decision', 'ERROR')}")
if result.get("bound_action") != request_body["action"]:
    raise RuntimeError("Execution stopped: bound action mismatch")

consumed = call(f"/v1/decisions/{result['decision_id']}/consume", {
    "contract_version": "0.1",
    "organization_id": request_body["organization_id"],
    "action_fingerprint": result["action_fingerprint"],
    "policy_version": result["policy_version"],
    "execution_attempt_id": "exec_preview_001",
})
if not consumed.get("receipt", {}).get("consume_receipt_id"):
    raise RuntimeError("Execution stopped: invalid receipt")
print("Consume succeeded; continue with the exact bound action.")
```
{% endtab %}
{% endtabs %}

## Next steps

- [Make your first decision](first-decision.md)
- [Consume an ALLOW decision](consume-allow.md)
- [Full API reference](../api-reference/overview.md)
