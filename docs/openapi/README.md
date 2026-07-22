---
description: SignGate public OpenAPI 3.1 specification and API-reference integration notes.
---

# OpenAPI specification

The public OpenAPI 3.1 document is the source of truth for SignGate's public preview endpoints, schemas, authentication model, and error responses.

{% hint style="info" %}
The public specification intentionally excludes `POST /internal/dogfood/founder-approval-grants`. That endpoint remains repository-only in the internal specification.
{% endhint %}

## Download

- [Public OpenAPI 3.1 JSON](signgate-public-v0.1.openapi.json)
- Version: `0.1.0-preview`
- Authentication: bearer API key
- Operations: `createDecision`, `consumeDecision`

## Public operations

<table data-view="cards">
  <thead>
    <tr>
      <th></th>
      <th></th>
      <th data-hidden data-card-target data-type="content-ref"></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>POST /v1/decisions</strong></td>
      <td>Evaluate one complete deploy_change action.</td>
      <td><a href="../zh/api-reference/create-decision.md">../zh/api-reference/create-decision.md</a></td>
    </tr>
    <tr>
      <td><strong>POST /v1/decisions/{decision_id}/consume</strong></td>
      <td>Atomically consume an available ALLOW before execution.</td>
      <td><a href="../zh/api-reference/consume-decision.md">../zh/api-reference/consume-decision.md</a></td>
    </tr>
  </tbody>
</table>

## GitBook interactive reference

GitBook can generate an interactive, testable API Reference directly from this specification. Until an authorized preview host is publicly reachable, the documented server remains a placeholder and readers should not treat the **Test it** control as a production endpoint.
