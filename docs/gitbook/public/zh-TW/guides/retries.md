---
description: 從 timeout 恢復且不產生 duplicate logical actions。
---

# 安全 retry

只有 body 與 logical operation 完全相同時才重用 identifier。

{% hint style="info" %}
**Primary constraint:** 改變 body 必須使用新的 identifier 並重新 evaluation。
{% endhint %}

## Create retry

Ambiguous transport failure 後，以相同 `request_id` 與 semantically identical content retry `POST /v1/decisions`。

## Consume retry

以相同 `execution_attempt_id` retry consume 來恢復原始 receipt；不要只因 response 遺失就建立新 attempt。

## Backoff

對 `503` 與 transient network errors 使用 bounded exponential backoff；若 decision 已過期，建立新 decision。

## Conflicts

`409` 不是 generic transient failure；判斷 identical retry 是否安全前先檢查 error code。
