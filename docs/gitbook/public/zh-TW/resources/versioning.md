---
description: 依 explicit contract 與 policy versions 進行 integration。
---

# Versioning

Request 宣告 `contract_version`；response 識別 `policy_version`，讓 client 驗證 contract 與 evaluated policy context。

{% hint style="info" %}
**Primary constraint:** 不得 silently accept unknown contract version。
{% endhint %}

## Contract version

Version `0.1` 定義目前 preview request 與 response envelope。

## Policy version

Response policy version 必須原樣包含在 consume，並由 executor 驗證。

## OpenAPI

[Public OpenAPI 3.1 specification](../../openapi/signgate-public-v0.1.openapi.json) 是 public schemas 與 operations 的 machine-readable source。
