---
description: 暫停 execution 並啟動 authorized approval workflow。
---

# 處理 REQUIRE_APPROVAL

`REQUIRE_APPROVAL` 是不可執行的 policy result。

{% hint style="info" %}
**Primary constraint:** 不得 consume 或執行回傳 `REQUIRE_APPROVAL` 的 decision。
{% endhint %}

## Client behavior

1. 記錄 decision ID、audit ID 與 reason codes。
2. 將完整 bound action 交給 authorized approval process。
3. 等待 authorized approval。
4. 使用 required approval evidence 送出新的 decision request。
5. 從頭判斷新的 response。

## 禁止做法

不得修改原 response、在 local 轉成 `ALLOW`、重用 expired approval 或跳過新的 evaluation。

## 相關內容

[Decision values](../concepts/decision-values.md) · [Mandates 與 evidence](../concepts/mandates-and-evidence.md)
