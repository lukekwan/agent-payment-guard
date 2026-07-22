# API reference

The public preview API contains two endpoints:

| Method | Endpoint | Required scope |
| --- | --- | --- |
| `POST` | [`/v1/decisions`](create-decision.md) | `decision:create` |
| `POST` | [`/v1/decisions/{decision_id}/consume`](consume-decision.md) | `decision:consume` |

All request and response bodies use `application/json`. The canonical machine-readable contract is the [public OpenAPI 3.1 specification](../../openapi/signgate-public-v0.1.openapi.json).

The internal Founder dogfood endpoint is not a public product API and is intentionally excluded from these pages.
