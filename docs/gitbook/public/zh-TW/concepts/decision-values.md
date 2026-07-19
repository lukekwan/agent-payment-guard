---
description: 明確處理每一種 policy outcome。
---

# ALLOW、REQUIRE_APPROVAL 與 DENY

Decision value 表示 requested action 可以繼續、需要新的 approved request，或必須停止。

{% hint style="info" %}
**Primary constraint:** HTTP `200` 只代表 evaluation 完成，不能單獨授權 execution。
{% endhint %}

## ALLOW

只有 executor 驗證 response 且 atomic consume 成功後，完全相同的 normalized action 才可以繼續。

## REQUIRE_APPROVAL

Execution 尚未被授權。取得 authorized approval 後，送出新的 decision request 並重新判斷 response。

## DENY

不得執行。不得透過不變的 input 反覆重試來規避 policy。

## Fail-closed client rule

```text
if decision != ALLOW: stop
if verification fails: stop
if consume fails: stop
execute only after a valid consume receipt
```
