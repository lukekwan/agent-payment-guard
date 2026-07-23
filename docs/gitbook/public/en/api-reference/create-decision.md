---
description: Evaluate a complete deploy_change action and return a policy decision.
---

# Create a decision

Evaluate one complete `deploy_change` action and return `ALLOW`, `REQUIRE_APPROVAL`, or `DENY`.

{% hint style="warning" %}
HTTP 200 only means evaluation completed; execution requires a verified ALLOW and successful atomic consume.
{% endhint %}

## Method and path

```http
POST /v1/decisions
```

## Interactive API

{% openapi src="https://raw.githubusercontent.com/lukekwan/agent-payment-guard/docs/doc-sg-001-api-docs/docs/gitbook/public/openapi/signgate-public-v0.1.openapi.json" path="/v1/decisions" method="post" %}

{% hint style="info" %}
The Test it panel is for an authorized preview environment only. Replace the placeholder host and provide a preview credential; production execution is unavailable.
{% endhint %}

## Authentication

Bearer API key. Required scope: `decision:create`.

## Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `contract_version` | string | Yes | Must be `0.1`. |
| `request_id` | string | Yes | Organization-scoped idempotency key. |
| `organization_id` | string | Yes | Must match the authenticated organization. |
| `agent` | object | Yes | Authenticated coding-agent identity. |
| `action` | object | Yes | Complete `deploy_change` target and parameters. |
| `intent` | string | No | Descriptive only; never overrides policy. |
| `mandate` | object | Yes | Delegated scope, issuer, and expiry. |
| `evidence` | array | Yes | Between 1 and 128 verified observations. |
| `context` | object | No | Optional request timestamp. |

### Action parameters

| Field | Required | Purpose |
| --- | --- | --- |
| `git_commit` | Yes | Binds the proposed source revision. |
| `artifact_digest` or `diff_digest` | One | Binds the evaluated artifact or diff. |
| `changed_paths`, `changed_routes` | Yes | Describe the execution-relevant surface. |
| `touches_secrets`, `touches_dns`, `touches_permissions`, `touches_credentials` | Yes | Protected-surface declarations. |
| `deployment_strategy`, `deployment_command_id` | Yes | Identify the execution mode. |
| `configuration_fingerprint` | Yes | Binds configuration. |
| `ci_evidence` | Yes | Commit-bound CI results. |

## Request example

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

## Response examples

The `bound_action` below is abbreviated; the actual response contains the complete normalized action.

{% tabs %}
{% tab title="ALLOW" %}
```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "decision": "ALLOW",
  "decision_id": "dec_preview_001",
  "request_id": "req_preview_001",
  "organization_id": "org_example",
  "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
  "bound_action": { "type": "deploy_change", "target": {}, "parameters": {} },
  "policy_version": "deploy_policy_preview_01",
  "issued_at": "2030-01-01T12:00:00Z",
  "expires_at": "2030-01-01T12:15:00Z",
  "reason_codes": ["PREVIEW_DEPLOY_POLICY_PASSED"],
  "required_checks": [],
  "approval": { "required": false },
  "execution_directive": {
    "action": "EXECUTE",
    "max_uses": 1,
    "replay_protection": "SERVICE_CONSUME_REQUIRED"
  },
  "audit_id": "audit_preview_001"
}
```
{% endtab %}

{% tab title="REQUIRE_APPROVAL" %}
```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "decision": "REQUIRE_APPROVAL",
  "decision_id": "dec_approval_001",
  "request_id": "req_preview_001",
  "organization_id": "org_example",
  "action_fingerprint": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "bound_action": { "type": "deploy_change", "target": {}, "parameters": {} },
  "policy_version": "deploy_policy_preview_01",
  "issued_at": "2030-01-01T12:00:00Z",
  "expires_at": "2030-01-01T12:15:00Z",
  "reason_codes": ["PERMISSION_CHANGE_REQUIRES_APPROVAL"],
  "required_checks": ["AUTHORIZED_APPROVAL"],
  "approval": { "required": true, "grant_binding_required": true },
  "execution_directive": { "action": "DO_NOT_EXECUTE", "max_uses": 0, "replay_protection": "SERVICE_CONSUME_REQUIRED" },
  "audit_id": "audit_approval_001"
}
```
{% endtab %}

{% tab title="DENY" %}
```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "decision": "DENY",
  "decision_id": "dec_deny_001",
  "request_id": "req_preview_001",
  "organization_id": "org_example",
  "action_fingerprint": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "bound_action": { "type": "deploy_change", "target": {}, "parameters": {} },
  "policy_version": "deploy_policy_preview_01",
  "issued_at": "2030-01-01T12:00:00Z",
  "expires_at": "2030-01-01T12:15:00Z",
  "reason_codes": ["SECRET_CHANGE_NOT_SUPPORTED_V0_1"],
  "required_checks": [],
  "approval": { "required": false },
  "execution_directive": { "action": "DO_NOT_EXECUTE", "max_uses": 0, "replay_protection": "SERVICE_CONSUME_REQUIRED" },
  "audit_id": "audit_deny_001"
}
```
{% endtab %}

{% tab title="Error" %}
```json
{
  "contract_version": "0.1",
  "error": "SCHEMA_INVALID",
  "reason_codes": ["SCHEMA_INVALID"],
  "request_id": "req_preview_001",
  "enforcement_effect": "DENY",
  "audit_id": "audit_error_001"
}
```
{% endtab %}
{% endtabs %}

## Decision semantics

- `ALLOW`: Verify the complete bound action and fingerprint, then consume immediately before execution.
- `REQUIRE_APPROVAL`: Stop execution; after authorized approval, submit a new request.
- `DENY`: Stop execution.

## Error responses

| Status | Category | Client behavior |
| --- | --- | --- |
| `400` | Malformed JSON | Fix serialization; do not execute. |
| `401` | Authentication | Fix credentials; do not execute. |
| `403` | Authorization or tenant mismatch | Fix scope or organization; do not execute. |
| `409` | Request-ID conflict | Do not reuse an ID for different content. |
| `422` | Contract validation | Fix the request schema. |
| `500`, `503` | Service failure | Retry safely or defer; never bypass. |

## Retry and idempotency

After an ambiguous timeout, retry with the same `request_id` and identical body. The same ID with different content returns `409`.

## Security notes

- Do not include raw secrets in the request.
- Do not trust a client-declared organization without credential binding.
- Reject unknown execution-relevant fields.

## Related guides

- [Evaluate a preview deployment](../guides/preview-deployment.md)
- [Handle REQUIRE_APPROVAL](../guides/require-approval.md)
- [Validate fingerprints](../guides/fingerprints.md)
