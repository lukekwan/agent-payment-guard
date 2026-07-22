---
description: Submit a complete action and interpret the SignGate decision safely.
---

# Make your first decision

Use `POST /v1/decisions` to evaluate one complete `deploy_change` action.

{% hint style="info" %}
**Primary constraint:** HTTP 200 does not authorize execution; inspect `decision`.
{% endhint %}

## Request

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

## Call the endpoint

```bash
curl --fail-with-body --silent --show-error \
  "$SIGNGATE_BASE_URL/v1/decisions" \
  -H "Authorization: Bearer $SIGNGATE_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @decision-request.json
```

## Interpret the result

- `ALLOW`: verify the bound action and fingerprint, then consume.
- `REQUIRE_APPROVAL`: stop; after authorized approval, submit a fresh request.
- `DENY`: stop.

## Next

[Consume the ALLOW](consume-allow.md).
