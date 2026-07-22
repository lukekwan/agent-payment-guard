---
description: 比較 cURL、JavaScript 與 Python 的完整 ALLOW enforcement flow。
---

# 完整 ALLOW flow

三個範例都遵守 create → verify → consume → execute 的順序。

{% hint style="info" %}
**Primary constraint:** 範例只在有效 consume receipt 後結束；真正 executor 必須接在該檢查之後。
{% endhint %}

## 選擇語言

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
      <td><strong>cURL</strong></td>
      <td>Shell 與 jq fail-closed flow。</td>
      <td><a href="curl.md">curl.md</a></td>
    </tr>
    <tr>
      <td><strong>JavaScript</strong></td>
      <td>Native fetch flow。</td>
      <td><a href="javascript.md">javascript.md</a></td>
    </tr>
    <tr>
      <td><strong>Python</strong></td>
      <td>Standard-library HTTP flow。</td>
      <td><a href="python.md">python.md</a></td>
    </tr>
  </tbody>
</table>
