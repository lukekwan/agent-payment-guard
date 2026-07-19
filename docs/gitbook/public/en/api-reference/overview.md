---
description: Endpoints, schemas, and errors for the public SignGate Preview execution API.
---

# API reference

The public API has two operations: create a policy decision and atomically consume an `ALLOW`.

{% hint style="info" %}
**Primary constraint:** The public API does not provide production execution.
{% endhint %}

## Base URL

```text
$SIGNGATE_BASE_URL
```

Use the Preview execution environment URL supplied by your authorized integration.

## Authentication

```http
Authorization: Bearer <SIGNGATE_API_KEY>
```

## Endpoints

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
      <td><strong>Create a decision</strong></td>
      <td>POST /v1/decisions</td>
      <td><a href="create-decision.md">create-decision.md</a></td>
    </tr>
    <tr>
      <td><strong>Consume an ALLOW</strong></td>
      <td>POST /v1/decisions/{decision_id}/consume</td>
      <td><a href="consume-decision.md">consume-decision.md</a></td>
    </tr>
  </tbody>
</table>

## Reference map

- [Schemas](schemas.md)
- [Request schemas](request-schemas.md)
- [Response schemas](response-schemas.md)
- [Error responses](errors.md)
- [Reason codes](reason-codes.md)
