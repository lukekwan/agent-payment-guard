---
description: 瀏覽 request 與 response data model。
---

# Schemas

Public API 使用 strict JSON objects；可能影響 execution semantics 的 unknown fields 會被拒絕。

{% hint style="info" %}
**Primary constraint:** Schema validation failure 一律視為沒有授權。
{% endhint %}

## Request schemas

[DecisionRequest](request-schemas.md#decisionrequest) · [ConsumeRequest](request-schemas.md#consumerequest)

## Response schemas

[DecisionResponse](response-schemas.md#decisionresponse) · [ConsumeResponse](response-schemas.md#consumeresponse) · [ErrorResponse](response-schemas.md#errorresponse)

## Source of truth

下載 [public OpenAPI 3.1 specification](../../openapi/signgate-public-v0.1.openapi.json)。
