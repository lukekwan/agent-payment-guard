# Authentication

SignGate preview uses bearer API keys. Send the credential in every request:

```http
Authorization: Bearer <preview-api-key>
```

Credentials are bound to an organization, principal identity, principal type, scopes, status, digest version, and credential prefix. Raw keys must never be stored in D1, committed to the repository, or written to logs.

## Required scopes

| Operation | Scope |
| --- | --- |
| Create a decision | `decision:create` |
| Consume an `ALLOW` | `decision:consume` |

Use separate, least-privilege credentials for the evaluating agent and executor. The examples read them from `SIGNGATE_AGENT_KEY` and `SIGNGATE_EXECUTOR_KEY` environment variables.

## Organization binding

`organization_id` is required in request bodies and must exactly match the authenticated credential's organization. Cross-tenant failures return a non-enumerating authorization error.

## Preview base URL

```text
https://preview.signgate.local
```

This is a placeholder preview host. Use only the preview host supplied by an authorized integration. No production base URL is authorized in DOC-SG-001.

Next: [Decision lifecycle](decision-lifecycle.md)
