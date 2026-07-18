import json
import os
import urllib.request


base_url = os.environ.get("SIGNGATE_BASE_URL", "https://preview.signgate.local")
agent_key = os.environ.get("SIGNGATE_AGENT_KEY")

if not agent_key:
    raise SystemExit("Set SIGNGATE_AGENT_KEY to a preview decision:create credential.")

payload = {
    "contract_version": "0.1",
    "request_id": "req_doc_preview_001",
    "organization_id": "org_nomos_labs",
    "agent": {
        "id": "codex_dev_01",
        "type": "coding_agent",
        "authenticated_by": "internal_service_identity",
    },
    "action": {
        "type": "deploy_change",
        "target": {
            "environment": "preview",
            "service": "signgate-worker",
            "project": "base-agent-preflight",
            "repository": {
                "host": "github.com",
                "owner": "lukekwan",
                "repo": "agent-payment-guard",
                "remote_url": "https://github.com/lukekwan/agent-payment-guard",
            },
        },
        "parameters": {
            "git_commit": "901080e5315bdef8deb81eb69ed44853f17ce680",
            "artifact_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            "diff_digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222",
            "changed_paths": [
                "migrations/0008_signgate_deploy_change_decisions.sql",
                "src/index.js",
            ],
            "changed_routes": ["/v1/decisions", "/v1/decisions/{decision_id}/consume"],
            "touches_secrets": False,
            "touches_dns": False,
            "touches_permissions": False,
            "touches_credentials": False,
            "deployment_strategy": "worker_preview",
            "deployment_command_id": "deploy:preview",
            "configuration_fingerprint": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
            "ci_evidence": {
                "provider": "github_actions",
                "run_id": "run_doc_001",
                "commit": "901080e5315bdef8deb81eb69ed44853f17ce680",
                "status": "passed",
                "checks": ["lint", "unit", "contract"],
            },
        },
    },
    "intent": "Deploy approved SignGate preview changes",
    "mandate": {
        "id": "mandate_doc_001",
        "scope": ["deploy:preview"],
        "issued_by": "founder",
        "expires_at": "2026-07-20T12:00:00Z",
    },
    "evidence": [
        {
            "id": "ev_ci_doc_001",
            "type": "test_result",
            "source": "ci",
            "status": "passed",
            "observed_at": "2026-07-19T12:00:00Z",
            "subject_fingerprint": "sha256:4444444444444444444444444444444444444444444444444444444444444444",
        }
    ],
    "context": {"requested_at": "2026-07-19T12:01:00Z"},
}

request = urllib.request.Request(
    f"{base_url}/v1/decisions",
    data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {agent_key}",
        "Content-Type": "application/json",
    },
    method="POST",
)

with urllib.request.urlopen(request, timeout=30) as response:
    body = json.loads(response.read().decode("utf-8"))

if body.get("decision") != "ALLOW":
    raise SystemExit(f"SignGate did not return executable ALLOW: {body}")

print(json.dumps(body, indent=2))
