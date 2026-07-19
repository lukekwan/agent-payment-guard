---
description: 在部署動作真正執行前，取得可驗證、可稽核、限時且單次使用的政策決策。
---

# SignGate API

**讓 coding agent 在執行 preview deployment 前，先通過明確、可稽核的 policy gate。**

SignGate 接收完整的 `deploy_change` action，回傳 `ALLOW`、`REQUIRE_APPROVAL` 或 `DENY`，並把授權綁定到同一個 organization、action fingerprint、policy version 與有效期限。

{% hint style="warning" %}
**Preview v0.1** — Production deployment is not authorized. `ALLOW` is not executable until atomic consume succeeds. Every non-valid-ALLOW outcome fails closed.
{% endhint %}

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
      <td><strong>🚀 五分鐘快速開始</strong></td>
      <td>設定 credential、建立 decision，再安全地 consume ALLOW。</td>
      <td><a href="zh/quickstart.md">zh/quickstart.md</a></td>
    </tr>
    <tr>
      <td><strong>🧭 Decision 生命週期</strong></td>
      <td>理解 evaluate、verify、consume 與 execute 的安全邊界。</td>
      <td><a href="zh/decision-lifecycle.md">zh/decision-lifecycle.md</a></td>
    </tr>
    <tr>
      <td><strong>⚡ API 參考</strong></td>
      <td>查看 request、response、狀態碼與兩個 public endpoints。</td>
      <td><a href="zh/api-reference/README.md">zh/api-reference/README.md</a></td>
    </tr>
    <tr>
      <td><strong>🔐 驗證與授權</strong></td>
      <td>使用 organization-bound bearer credentials 與最小權限 scopes。</td>
      <td><a href="zh/authentication.md">zh/authentication.md</a></td>
    </tr>
  </tbody>
</table>

## 一個安全的部署決策流程

{% stepper %}
{% step %}
### 建立 decision

把 agent identity、完整 deployment action、mandate 與 commit-bound test evidence 傳給 `POST /v1/decisions`。
{% endstep %}

{% step %}
### 驗證回應

只有 `decision: ALLOW` 才能繼續；executor 仍須核對 `bound_action`、`action_fingerprint`、policy version 與 expiry。
{% endstep %}

{% step %}
### Atomic consume

在 irreversible action 前呼叫 `POST /v1/decisions/{decision_id}/consume`。只有 consume receipt 成功後才能執行完全相同的 bound action。
{% endstep %}
{% endstepper %}

## Public API surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/v1/decisions` | 評估一個完整的 `deploy_change` action。 |
| `POST` | `/v1/decisions/{decision_id}/consume` | Atomically consume 一個未過期、未使用的 `ALLOW`。 |

{% hint style="info" %}
Public documentation 不包含 internal Founder dogfood approval-grant endpoint。Internal OpenAPI specification 只保留在 repository，且不會出現在 public navigation 或 examples。
{% endhint %}

## 選擇語言

- [繁體中文文件](zh/README.md)
- [English documentation](en/README.md)

## Source of truth

- [OpenAPI 3.1 規格與使用方式](openapi/README.md)
- [Public OpenAPI JSON](openapi/signgate-public-v0.1.openapi.json)
- [版本紀錄](changelog.md)
- [Help Center](help-center.md)
