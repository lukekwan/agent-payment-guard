---
description: SignGate public Preview execution API 的 endpoints、schemas 與 errors。
---

# API 參考

Public API 只有兩個操作：建立 policy decision，以及 atomically consume 一個 `ALLOW`。

{% hint style="info" %}
**Primary constraint:** Public API 不提供 production execution。
{% endhint %}

## Base URL

```text
$SIGNGATE_BASE_URL
```

使用 authorized integration 提供的 Preview execution environment URL。

## 驗證

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
      <td><strong>建立 decision</strong></td>
      <td>POST /v1/decisions</td>
      <td><a href="create-decision.md">create-decision.md</a></td>
    </tr>
    <tr>
      <td><strong>Consume ALLOW</strong></td>
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
