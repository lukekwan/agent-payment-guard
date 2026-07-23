---
description: Navigate the request and response data model.
---

# Schemas

The public API uses strict JSON objects: unknown fields are rejected when they could affect execution semantics.

{% hint style="info" %}
**Primary constraint:** Treat a schema-validation failure as no authorization.
{% endhint %}

## Request schemas

[DecisionRequest](request-schemas.md#decisionrequest) · [ConsumeRequest](request-schemas.md#consumerequest)

## Response schemas

[DecisionResponse](response-schemas.md#decisionresponse) · [ConsumeResponse](response-schemas.md#consumeresponse) · [ErrorResponse](response-schemas.md#errorresponse)

## Source of truth

Download the [public OpenAPI 3.1 specification](https://raw.githubusercontent.com/lukekwan/agent-payment-guard/docs/doc-sg-001-api-docs/docs/gitbook/public/openapi/signgate-public-v0.1.openapi.json).
