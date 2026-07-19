---
description: Agent 呼叫 preview executor 前先提交 deployment proposal。
---

# 評估 preview deployment

Tests 完成後、任何 deployment command 開始前使用此流程。

{% hint style="info" %}
**Primary constraint:** Request 必須描述 executor 將執行的完整 action。
{% endhint %}

## Workflow

1. 收集 target、revision、changed surfaces、configuration fingerprint 與 passing CI evidence。
2. 確認 mandate 允許 preview deployment。
3. 呼叫 `POST /v1/decisions`。
4. 除 verified `ALLOW` 外全部停止。
5. Execution 前立即 consume。

## Protected surfaces

準確宣告 secrets、DNS、permissions 與 credential changes；缺少 flag 會讓 action description invalid，必須 fail validation 或 enforcement。

## 下一步

[只有 consume 後才執行](safe-execution.md)。
