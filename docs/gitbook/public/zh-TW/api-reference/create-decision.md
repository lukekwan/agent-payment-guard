---
description: 評估完整 deploy_change action 並回傳 policy decision。
---

# 建立 decision

評估完整的 `deploy_change` action，並回傳 `ALLOW`、`REQUIRE_APPROVAL` 或 `DENY`。

{% hint style="warning" %}
HTTP 200 只代表 evaluation 完成；只有 verified ALLOW 且 atomic consume 成功後才能執行。
{% endhint %}

## Method 與 path

```http
POST /v1/decisions
```

## 互動式 API

{% openapi src="https://raw.githubusercontent.com/lukekwan/agent-payment-guard/docs/doc-sg-001-api-docs/docs/gitbook/public/openapi/signgate-public-v0.1.openapi.json" path="/v1/decisions" method="post" %}

{% hint style="info" %}
Test it 面板只限授權的 preview environment。請替換 placeholder host 並提供 preview credential；目前不提供 production execution。
{% endhint %}

## Authentication

Bearer API key。必要 scope: `decision:create`.

## Request body

| Field | Type | Required | 說明 |
| --- | --- | --- | --- |
| `contract_version` | string | Yes | 必須是 `0.1`。 |
| `request_id` | string | Yes | Organization-scoped idempotency key。 |
| `organization_id` | string | Yes | 必須符合 authenticated organization。 |
| `agent` | object | Yes | Authenticated coding-agent identity。 |
| `action` | object | Yes | 完整的 `deploy_change` target 與 parameters。 |
| `intent` | string | No | 僅供描述，不會覆蓋 policy。 |
| `mandate` | object | Yes | Delegated scope、issuer 與 expiry。 |
| `evidence` | array | Yes | 1 至 128 筆 verified observations。 |
| `context` | object | No | Optional request timestamp。 |

### Action parameters

| Field | Required | 用途 |
| --- | --- | --- |
| `git_commit` | Yes | 綁定 proposed source revision。 |
| `artifact_digest` or `diff_digest` | One | 綁定 evaluated artifact 或 diff。 |
| `changed_paths`, `changed_routes` | Yes | 描述 execution-relevant surface。 |
| `touches_secrets`, `touches_dns`, `touches_permissions`, `touches_credentials` | Yes | Protected-surface declarations。 |
| `deployment_strategy`, `deployment_command_id` | Yes | 指定 execution mode。 |
| `configuration_fingerprint` | Yes | 綁定 configuration。 |
| `ci_evidence` | Yes | Commit-bound CI results。 |

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

下列 `bound_action` 為縮寫；實際 response 會包含完整 normalized action。

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

- `ALLOW`: 驗證完整 bound action 與 fingerprint，然後立即在 execution 前 consume。
- `REQUIRE_APPROVAL`: 停止 execution；取得 authorized approval 後送出新的 request。
- `DENY`: 停止 execution。

## Error responses

| Status | 類別 | Client behavior |
| --- | --- | --- |
| `400` | Malformed JSON | 修正 serialization，不得執行。 |
| `401` | Authentication | 修正 credential，不得執行。 |
| `403` | Authorization or tenant mismatch | 修正 scope 或 organization，不得執行。 |
| `409` | Request-ID conflict | 不要用不同 payload 重用 ID。 |
| `422` | Contract validation | 修正 request schema。 |
| `500`, `503` | Service failure | 安全 retry 或 defer；絕不繞過。 |

## Retry 與 idempotency

遇到 ambiguous timeout 時，以相同 `request_id` 與完全相同 body retry。相同 ID 搭配不同 body 會回傳 `409`。

## Security notes

- 不要在 request 中放入 raw secrets。
- 不要信任 client 自己宣告的 organization。
- 拒絕 unknown execution-relevant fields。

## Related guides

- [評估 preview deployment](../guides/preview-deployment.md)
- [處理 REQUIRE_APPROVAL](../guides/require-approval.md)
- [驗證 fingerprints](../guides/fingerprints.md)
