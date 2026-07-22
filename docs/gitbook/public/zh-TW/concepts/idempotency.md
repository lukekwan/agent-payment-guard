---
description: 在不改變語意的情況下安全 retry。
---

# Idempotency 與 retries

Decision creation 在 organization 內使用 `request_id`；consume 在 decision 內使用 `execution_attempt_id`。

{% hint style="info" %}
**Primary constraint:** 不得為不同內容重複使用 idempotency identifier。
{% endhint %}

## Decision creation

完全相同的 request 可以回傳原始 logical result；相同 `request_id` 搭配不同 payload 會回傳 HTTP `409`。

## Consume

Same-attempt retry 會回傳原始 receipt；成功 consume 後使用不同 attempt 會回傳 HTTP `409`。

## Network recovery

遇到不明確 timeout 時，以相同 identifier 與完全相同 body retry。除非已確認或放棄舊 outcome，否則不要產生新 identifier。

## 指南

[安全 retry](../guides/retries.md)。
