# SignGate API

SignGate v0.1 is a preview policy decision API for `deploy_change` actions. It evaluates a proposed preview deployment and returns `ALLOW`, `REQUIRE_APPROVAL`, or `DENY`.

> Production deployment is not authorized. ALLOW is not executable until atomic consume succeeds. Every non-valid-ALLOW outcome fails closed.

## Choose a language

- [English documentation](en/README.md)
- [繁體中文文件](zh/README.md)

## Public API surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/v1/decisions` | Evaluate a `deploy_change` action. |
| `POST` | `/v1/decisions/{decision_id}/consume` | Atomically consume an unexpired, unused `ALLOW`. |

The internal Founder dogfood approval-grant endpoint is intentionally excluded from this public GitBook navigation and the public OpenAPI specification.

## Source of truth

- [Public OpenAPI 3.1 specification](openapi/signgate-public-v0.1.openapi.json)
- Internal OpenAPI remains repository-only and is not part of the public navigation.
