# Create a decision

```http
POST /v1/decisions
```

Evaluates one complete `deploy_change` action. HTTP `200` means evaluation completed; it does not mean execution is authorized.

## Authentication

Requires a bearer credential with `decision:create`. See [Authentication](../authentication.md).

## Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `contract_version` | string | Yes | Must be `0.1`. |
| `request_id` | string | Yes | Organization-scoped idempotency key. |
| `organization_id` | string | Yes | Must match the authenticated organization. |
| `agent` | object | Yes | Authenticated coding-agent identity. |
| `action` | object | Yes | Complete `deploy_change` target and parameters. |
| `intent` | string | No | Descriptive only; never overrides policy. |
| `mandate` | object | Yes | Mandate ID, scopes, issuer, and expiry. |
| `evidence` | array | Yes | Between 1 and 128 evidence records. |
| `context` | object | No | Optional request timestamp context. |

The action must include repository identity, target environment and service, commit-bound CI evidence, changed paths and routes, protected-surface flags, deployment command, and configuration fingerprint. Unknown fields are rejected.

## Request example

```json
{
  "contract_version": "0.1",
  "request_id": "req_doc_preview_001",
  "organization_id": "org_nomos_labs",
  "agent": {
    "id": "codex_dev_01",
    "type": "coding_agent",
    "authenticated_by": "internal_service_identity"
  },
  "action": {
    "type": "deploy_change",
    "target": {
      "environment": "preview",
      "service": "signgate-worker",
      "repository": {
        "host": "github.com",
        "owner": "lukekwan",
        "repo": "agent-payment-guard",
        "remote_url": "https://github.com/lukekwan/agent-payment-guard"
      }
    },
    "parameters": {
      "git_commit": "901080e5315bdef8deb81eb69ed44853f17ce680",
      "changed_paths": ["src/index.js"],
      "changed_routes": ["/v1/decisions"],
      "touches_secrets": false,
      "touches_dns": false,
      "touches_permissions": false,
      "touches_credentials": false,
      "deployment_strategy": "worker_preview",
      "deployment_command_id": "deploy:preview",
      "configuration_fingerprint": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
      "ci_evidence": {
        "provider": "github_actions",
        "run_id": "run_doc_001",
        "commit": "901080e5315bdef8deb81eb69ed44853f17ce680",
        "status": "passed",
        "checks": ["lint", "unit", "contract"]
      }
    }
  },
  "mandate": {
    "id": "mandate_doc_001",
    "scope": ["deploy:preview"],
    "issued_by": "founder",
    "expires_at": "2026-07-20T12:00:00Z"
  },
  "evidence": [{
    "id": "ev_ci_doc_001",
    "type": "test_result",
    "source": "ci",
    "status": "passed",
    "observed_at": "2026-07-19T12:00:00Z"
  }]
}
```

## `200` response

The response includes the decision, identifiers, exact bound action, fingerprint, policy version, issue and expiry times, reason codes, approval requirements, execution directive, and audit ID.

```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "decision": "ALLOW",
  "decision_id": "dec_doc_001",
  "request_id": "req_doc_preview_001",
  "organization_id": "org_nomos_labs",
  "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
  "policy_version": "deploy_policy_2026_07_18_01",
  "issued_at": "2026-07-19T12:01:00Z",
  "expires_at": "2026-07-19T12:16:00Z",
  "reason_codes": ["PREVIEW_DEPLOY_POLICY_PASSED"],
  "required_checks": [],
  "approval": {"required": false},
  "execution_directive": {
    "action": "EXECUTE",
    "max_uses": 1,
    "replay_protection": "SERVICE_CONSUME_REQUIRED"
  },
  "audit_id": "audit_doc_001"
}
```

The canonical response also contains `bound_action`; it is omitted above only to keep the example compact. Verify it against the proposed action before continuing.

## Outcomes

- `ALLOW`: call [Consume a decision](consume-decision.md) immediately before execution.
- `REQUIRE_APPROVAL`: do not execute. Obtain trusted approval and submit a fresh request.
- `DENY`: do not execute.

Possible error statuses are `400`, `401`, `403`, `409`, `422`, `500`, and `503`. See [Error handling](../errors.md).
