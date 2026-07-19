---
description: 驗證 decision 授權的正是即將執行的 action。
---

# 驗證 fingerprints

對 validated normalized action 的 RFC 8785 canonical fingerprint envelope 計算 SHA-256。

{% hint style="info" %}
**Primary constraint:** Unknown execution-relevant fields 或任何 mismatch 都必須停止 execution。
{% endhint %}

## Validation sequence

1. 驗證 action schema。
2. Normalize schema-declared set fields。
3. 建立 authenticated action envelope。
4. 使用 RFC 8785 canonicalize。
5. 對 UTF-8 bytes 計算 SHA-256。
6. 使用 `sha256:` prefix 與 lowercase hex。
7. 與 response 和 receipt 比較。

## Mutation rule

任何 execution field 改變（包含 protected-surface flag）都會讓舊 fingerprint 與 decision invalid。

## Testing

為所有 execution fields 維護 cross-language golden vectors 與 mutation tests。
