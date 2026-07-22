---
description: 了解 preview control records 的保留期間。
---

# Retention

Preview decision、approval、audit、idempotency 與 consume records 使用 30 天 retention window。

{% hint style="info" %}
**Primary constraint:** 不要把 preview store 當作永久 business-record archive。
{% endhint %}

## Data minimization

只保留 idempotency、expiry、audit 與 single-use enforcement 所需的 control metadata。

## Client responsibility

只 export compliance process 所需的 minimal identifiers，不複製 prohibited secret 或 payload material。

## Production

此 preview 文件不定義 production retention、deletion、residency、backup 與 legal-hold policies。
