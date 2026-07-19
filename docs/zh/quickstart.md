---
description: 在五分鐘內完成 SignGate preview 的第一個 decision 與 atomic consume 流程。
---

# 五分鐘快速開始

這份指南會帶你建立一個 preview deployment decision，確認它可以執行，並在 deployment 前完成 atomic consume。

{% hint style="warning" %}
SignGate v0.1 只授權 preview/local action。範例中的 host 與 credentials 都是 placeholder；請使用授權 integration 提供的值。
{% endhint %}

{% stepper %}
{% step %}
### 設定環境變數

```bash
export SIGNGATE_BASE_URL="https://preview.signgate.local"
export SIGNGATE_AGENT_KEY="<decision:create credential>"
export SIGNGATE_EXECUTOR_KEY="<decision:consume credential>"
```

不要把 raw credential 寫進程式碼、commit、log 或 D1。
{% endstep %}

{% step %}
### 建立 decision

完整 request 必須包含 agent identity、repository 與 commit、changed paths、CI evidence、mandate 和所有 protected-surface flags。

{% tabs %}
{% tab title="cURL" %}
```bash
./docs/examples/curl/create-decision.sh
```
{% endtab %}

{% tab title="JavaScript" %}
```bash
node docs/examples/javascript/create-decision.mjs
```
{% endtab %}

{% tab title="Python" %}
```bash
python3 docs/examples/python/create_decision.py
```
{% endtab %}
{% endtabs %}

[查看完整 request body 與 response](api-reference/create-decision.md)。
{% endstep %}

{% step %}
### 驗證 `ALLOW`

HTTP `200` 只代表 evaluation 完成。繼續前必須確認：

- `decision` 是 `ALLOW`
- `bound_action` 與預計執行的 action 完全相同
- `action_fingerprint` 與 local canonical fingerprint 相同
- `expires_at` 尚未到期
- `execution_directive.action` 是 `EXECUTE`

`REQUIRE_APPROVAL` 和 `DENY` 都不授權執行。
{% endstep %}

{% step %}
### Consume decision

```bash
export SIGNGATE_DECISION_ID="dec_doc_001"
export SIGNGATE_ACTION_FINGERPRINT="sha256:..."
export SIGNGATE_POLICY_VERSION="deploy_policy_2026_07_18_01"
export SIGNGATE_EXECUTION_ATTEMPT_ID="exec_preview_001"

./docs/examples/curl/consume-decision.sh
```

只有 atomic consume 成功並回傳 receipt 後，executor 才能執行同一個 bound action。
{% endstep %}
{% endstepper %}

## 接下來

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
      <td><strong>Decision 生命週期</strong></td>
      <td>理解 single-use decision 如何防止 replay 與 action substitution。</td>
      <td><a href="decision-lifecycle.md">decision-lifecycle.md</a></td>
    </tr>
    <tr>
      <td><strong>API 參考</strong></td>
      <td>查看完整 request、response 與錯誤狀態。</td>
      <td><a href="api-reference/README.md">api-reference/README.md</a></td>
    </tr>
    <tr>
      <td><strong>錯誤處理</strong></td>
      <td>讓 agent 在所有異常情況下 fail closed。</td>
      <td><a href="errors.md">errors.md</a></td>
    </tr>
  </tbody>
</table>
