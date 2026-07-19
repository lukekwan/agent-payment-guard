---
description: 自主代理的政策與執行控制層。
---

# 控制自主代理可以執行哪些動作。

**Preview**

SignGate 會在執行前評估敏感的 agent action，並回傳與 action 綁定的 **ALLOW**、**REQUIRE_APPROVAL** 或 **DENY** decision。

{% tabs %}
{% tab title="開始使用" %}
[串接完整的 decision 與 consume 流程](getting-started/quickstart.md)。
{% endtab %}

{% tab title="API 參考" %}
[查看兩個 public endpoints](api-reference/overview.md)。
{% endtab %}
{% endtabs %}

## 一次決策，三種結果

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
      <td><strong>ALLOW</strong></td>
      <td>只有 atomic consume 成功後，完全相同的 action 才可以繼續。</td>
      <td><a href="concepts/decision-values.md#allow">concepts/decision-values.md#allow</a></td>
    </tr>
    <tr>
      <td><strong>REQUIRE_APPROVAL</strong></td>
      <td>執行會暫停；取得授權核准後，必須送出新的 decision request。</td>
      <td><a href="concepts/decision-values.md#require_approval">concepts/decision-values.md#require_approval</a></td>
    </tr>
    <tr>
      <td><strong>DENY</strong></td>
      <td>不得執行。</td>
      <td><a href="concepts/decision-values.md#deny">concepts/decision-values.md#deny</a></td>
    </tr>
  </tbody>
</table>

## Decision 流程

{% stepper %}
{% step %}
### Agent 提交完整 action

Request 包含 target、execution parameters、mandate 與 evidence。
{% endstep %}

{% step %}
### SignGate 評估 policy 與 evidence

SignGate 驗證 caller、檢查 request、normalize action，並套用目前的 policy。
{% endstep %}

{% step %}
### SignGate 回傳 decision

Response 會把結果綁定到 action fingerprint、policy version 與 expiry。
{% endstep %}

{% step %}
### Executor 驗證並 consume ALLOW

Executor 必須拒絕其他所有結果；只有 atomic consume 回傳有效 receipt 後才能執行。
{% endstep %}
{% endstepper %}

## Public endpoints

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
      <td><a href="api-reference/create-decision.md">api-reference/create-decision.md</a></td>
    </tr>
    <tr>
      <td><strong>Atomically consume ALLOW</strong></td>
      <td>POST /v1/decisions/{decision_id}/consume</td>
      <td><a href="api-reference/consume-decision.md">api-reference/consume-decision.md</a></td>
    </tr>
  </tbody>
</table>

{% hint style="warning" %}
此 preview 目前不提供 production execution。
{% endhint %}
