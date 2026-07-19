# Consume a decision

```http
POST /v1/decisions/{decision_id}/consume
```

Atomically consumes a valid `ALLOW` immediately before the executor begins the irreversible action. An `ALLOW` is not executable until this request succeeds.

## Authentication

Requires a bearer credential with `decision:consume`.

## Path parameter

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `decision_id` | string | Yes | Decision identifier returned by `POST /v1/decisions`; must match `^dec_[A-Za-z0-9_:-]+$`. |

## Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `contract_version` | string | Yes | Must be `0.1`. |
| `organization_id` | string | Yes | Must match the credential and decision. |
| `action_fingerprint` | string | Yes | Exact SHA-256 fingerprint returned with the decision. |
| `policy_version` | string | Yes | Exact policy version returned with the decision. |
| `execution_attempt_id` | string | Yes | Stable ID for this execution attempt. |

```json
{
  "contract_version": "0.1",
  "organization_id": "org_nomos_labs",
  "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
  "policy_version": "deploy_policy_2026_07_18_01",
  "execution_attempt_id": "exec_doc_001"
}
```

## `200` response

```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "receipt": {
    "consume_receipt_id": "rcpt_doc_001",
    "organization_id": "org_nomos_labs",
    "decision_id": "dec_doc_001",
    "execution_attempt_id": "exec_doc_001",
    "action_fingerprint": "sha256:9532edbd25e8a81cd35fbc207b7d5a980bdc971aa47f797cf8ead50bbed129ff",
    "policy_version": "deploy_policy_2026_07_18_01",
    "executor_principal_id": "executor_preview_01",
    "consumed_at": "2026-07-19T12:02:00Z"
  }
}
```

The same `execution_attempt_id` may replay the original receipt. A different attempt after consumption fails with `409` conflict semantics. Expired, non-`ALLOW`, unavailable, mismatched, or already-used decisions fail closed.
